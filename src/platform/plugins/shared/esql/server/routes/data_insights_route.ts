/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lastValueFrom, Observable, concat, of } from 'rxjs';
import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, PluginInitializerContext } from '@kbn/core/server';
import { DATA_INSIGHTS_ROUTE } from '@kbn/esql-types';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import { MessageRole, type ChatCompletionEvent } from '@kbn/inference-common';

import type { KibanaRequest } from '@kbn/core-http-server';

import type { EsqlServerPluginStart } from '../types';
import { resolveConnectorId } from './resolve_connector';

const getAbortSignal = (request: KibanaRequest): AbortSignal => {
  const controller = new AbortController();
  request.events.aborted$.subscribe({ complete: () => controller.abort() });
  return controller.signal;
};

const buildSummaryPrompt = ({
  query,
  columns,
  sampleRows,
  totalHits,
}: {
  query: string;
  columns: Array<{ name: string; type: string }>;
  sampleRows: Array<Record<string, unknown>>;
  totalHits: number;
}): string => {
  const columnsStr = columns.map((c) => `${c.name}:${c.type}`).join(', ');
  const sampleStr = sampleRows
    .map((row) => {
      const truncated: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'string' && value.length > 100) {
          truncated[key] = value.slice(0, 100) + '...';
        } else {
          truncated[key] = value;
        }
      }
      return JSON.stringify(truncated);
    })
    .join('\n');

  return `You are a data analyst assistant. Analyze the provided ES|QL query results and produce a concise, insightful summary in markdown format.

## Instructions
- Provide an overview of what the data represents based on the query and column names
- Identify key patterns, trends, or distributions in the sample data
- Highlight notable values, outliers, or anomalies
- Do NOT suggest follow-up queries — those will be generated separately
- Keep the response under 400 words
- Use these markdown headers: ## Overview, ## Key Patterns, ## Notable Values

## Data Context
ES|QL Query: ${query}
Total rows: ${totalHits}
Columns (${columns.length}): ${columnsStr}

Sample data (${sampleRows.length} of ${totalHits} rows):
${sampleStr}`;
};

const buildQuerySuggestionPrompt = ({
  query,
  columns,
  totalHits,
  previousQueries,
  focus,
}: {
  query: string;
  columns: Array<{ name: string; type: string }>;
  totalHits: number;
  previousQueries: string[];
  focus: string;
}): string => {
  const columnsStr = columns.map((c) => `${c.name}:${c.type}`).join(', ');
  const previousContext =
    previousQueries.length > 0
      ? `\nAlready suggested queries (do NOT repeat these or generate similar ones):\n${previousQueries
          .map((q) => `- ${q}`)
          .join('\n')}\n`
      : '';

  return `The user ran this ES|QL query: ${query}
It returned ${totalHits} rows with columns: ${columnsStr}
${previousContext}
Generate exactly one ES|QL query that ${focus}. Use the exact source and field names from the original query. Produce only the query fenced by the esql tag.`;
};

const extractEsqlQuery = (content: string): string => {
  const match = content.match(/```esql\s*([\s\S]*?)```/);
  return match ? match[1].trim() : content.trim();
};

export const registerDataInsightsRoute = (
  router: IRouter,
  getStartServices: CoreSetup<EsqlServerPluginStart>['getStartServices'],
  context: PluginInitializerContext
) => {
  router.post(
    {
      path: DATA_INSIGHTS_ROUTE,
      validate: {
        body: schema.object({
          query: schema.string(),
          columns: schema.arrayOf(
            schema.object({
              name: schema.string(),
              type: schema.string(),
            }),
            { maxSize: 30 }
          ),
          sampleRows: schema.arrayOf(schema.recordOf(schema.string(), schema.any()), {
            maxSize: 20,
          }),
          totalHits: schema.number(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    async (requestHandlerContext, request, response) => {
      const logger = context.logger.get();
      try {
        const { query, columns, sampleRows, totalHits } = request.body;
        const core = await requestHandlerContext.core;
        const [, { inference }] = await getStartServices();

        const connectorId = await resolveConnectorId({
          uiSettingsClient: core.uiSettings.client,
          inference,
          request,
        });

        if (!connectorId) {
          return response.badRequest({
            body: {
              message:
                'No AI connector configured. Please set up a connector in Stack Management to use this feature.',
            },
          });
        }

        const client = inference.getClient({ request });

        // Phase 1: Stream the summary via chatComplete
        const summaryPrompt = buildSummaryPrompt({ query, columns, sampleRows, totalHits });
        const summary$ = client.chatComplete({
          connectorId,
          stream: true,
          system: summaryPrompt,
          messages: [
            {
              role: MessageRole.User,
              content: 'Analyze the data and generate the summary.',
            },
          ],
        }) as Observable<ChatCompletionEvent>;

        // Phase 2: After summary, generate diverse queries using naturalLanguageToEsql
        const queryFocusAreas = [
          'aggregates or summarizes the data to reveal distributions or top values (e.g. STATS with COUNT, AVG, SUM grouped by a meaningful field)',
          'filters to a specific interesting subset or time range to drill down into anomalies or patterns',
          'explores relationships between different fields, or computes new derived metrics using EVAL',
        ];

        const generateQueries$ = new Observable<ChatCompletionEvent>((subscriber) => {
          const generateAll = async () => {
            const generatedQueries: string[] = [];

            for (const focus of queryFocusAreas) {
              try {
                const prompt = buildQuerySuggestionPrompt({
                  query,
                  columns,
                  totalHits,
                  previousQueries: generatedQueries,
                  focus,
                });

                const result = await lastValueFrom(
                  naturalLanguageToEsql({
                    client,
                    connectorId,
                    input: prompt,
                    functionCalling: 'auto',
                    logger,
                  })
                );

                const esqlQuery = extractEsqlQuery(result.content ?? '');
                if (esqlQuery) {
                  generatedQueries.push(esqlQuery);
                  subscriber.next({
                    type: 'suggestedQuery' as const,
                    query: esqlQuery,
                  } as unknown as ChatCompletionEvent);
                }
              } catch (err) {
                logger.error(`Failed to generate suggested query: ${err}`);
              }
            }

            subscriber.complete();
          };

          generateAll().catch((err) => subscriber.error(err));
        });

        const combined$ = concat(summary$, of(), generateQueries$);

        return response.ok({
          body: observableIntoEventSourceStream(combined$, {
            logger,
            signal: getAbortSignal(request),
          }),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Data insights failed: ${errorMessage}`);
        return response.customError({
          statusCode: 500,
          body: { message: errorMessage },
        });
      }
    }
  );
};
