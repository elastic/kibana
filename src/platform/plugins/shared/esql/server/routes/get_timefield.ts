/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient, IRouter, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  getIndexPatternFromESQLQuery,
  getProjectRoutingFromEsqlQuery,
  parseTimeFieldFromESQLQuery,
} from '@kbn/esql-utils';
import { Parser, isSubQuery } from '@elastic/esql';
import { TIMEFIELD_ROUTE } from '@kbn/esql-types';
import { esqlRouteRequestCounter, getErrorStatusCode } from '../metrics';

const ES_TIMESTAMP_FIELD_NAME = '@timestamp';

// ANTLR ALL(*) adaptive-prediction cost grows super-linearly with parenthesis nesting depth.
// Reject deep queries before touching the parser to prevent event-loop stalls (DoS via a single
// small request from a low-privileged account).
export const MAX_NESTING_DEPTH = 50;

export const getMaxNestingDepth = (query: string): number => {
  let max = 0;
  let depth = 0;
  for (const ch of query) {
    if (ch === '(' || ch === '[') {
      depth++;
      if (depth > max) max = depth;
    } else if (ch === ')' || ch === ']') {
      depth--;
    }
  }
  return max;
};

const isUnknownTimestampColumn = (error: unknown): boolean => {
  if (getErrorStatusCode(error) !== 400) {
    return false;
  }
  const reason = (error as { meta?: { body?: { error?: { reason?: string } } } })?.meta?.body?.error
    ?.reason;
  const message = error instanceof Error ? error.message : String(error);
  return `${reason ?? ''} ${message}`.includes(`Unknown column [${ES_TIMESTAMP_FIELD_NAME}]`);
};

const isUnknownSource = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return getErrorStatusCode(error) === 404 || /Unknown (index|view|dataset)/i.test(message);
};

/**
 * Whether the sources have a `@timestamp` time column, asked as
 * `FROM <sources> | KEEP @timestamp | DESCRIBE`. ES|QL resolves indices, views and datasets itself and,
 * as only that one column is kept, asks for that one field only.
 */
const describeHasTimeField = async ({
  client,
  sourceName,
  projectRouting,
  logger,
}: {
  client: ElasticsearchClient;
  sourceName: string;
  projectRouting: string | undefined;
  logger: Logger;
}): Promise<boolean> => {
  try {
    const { columns = [], values = [] } = await client.esql.query({
      query: `FROM ${sourceName} | KEEP ${ES_TIMESTAMP_FIELD_NAME} | DESCRIBE`,
      ...(projectRouting ? { project_routing: projectRouting } : {}),
    });
    const names = columns.map(({ name }) => name);
    const row = values.find((value) => value[names.indexOf('name')] === ES_TIMESTAMP_FIELD_NAME);
    const role = row?.[names.indexOf('role')];
    // `mixed`: the indices of a pattern disagree on the role of @timestamp, e.g. a date in most of them.
    // A pattern with one such index keeps its time field.
    return role === 'time' || role === 'mixed';
  } catch (error) {
    // A source without the column is an answer, not a failure
    if (isUnknownTimestampColumn(error)) {
      return false;
    }
    const message = error instanceof Error ? error.message : String(error);
    logger[isUnknownSource(error) ? 'debug' : 'error'](
      `DESCRIBE of "${sourceName}" failed while resolving ES|QL timefield: ${message}`,
      {
        tags: ['esql', 'timefield', 'describe'],
        error: { stack_trace: error instanceof Error ? error.stack : undefined },
      }
    );
    return false;
  }
};

/**
 * Resolves the time field of a query.
 *
 * It is extracted from the ES|QL query if specified. If not, it asks ES|QL whether the sources have the
 * default time field '@timestamp'. In case of subqueries, it verifies that all involved sources have it.
 *
 * @returns timeField or undefined
 */
const resolveTimeField = async (
  client: ElasticsearchClient,
  query: string,
  logger: Logger,
  projectRouting: string | undefined
): Promise<{ timeField: string | undefined }> => {
  const effectiveProjectRouting = getProjectRoutingFromEsqlQuery(query) ?? projectRouting;
  // Query is of the form "from index | where timefield >= ?_tstart".
  // At this point we just want to extract the timefield if present in the query
  const timeField = parseTimeFieldFromESQLQuery(query);
  if (timeField) {
    return { timeField };
  }

  // Trying to identify if there is @timestamp
  const { root } = Parser.parse(query);
  const sourceCommand = root.commands.find(({ name }) => ['from', 'ts'].includes(name));
  if (!sourceCommand) {
    return { timeField: undefined };
  }
  const sources = getIndexPatternFromESQLQuery(query);
  const hasSubqueries = sourceCommand.args.filter(isSubQuery).length > 0;
  const splitSources = sources
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // In case of subqueries we need to check all sources separately. Otherwise the whole list is one
  // query, so ES|QL evaluates the sources together.
  const sourceNames = hasSubqueries ? splitSources : [sources].filter(Boolean);
  if (!sourceNames.length) {
    return { timeField: undefined };
  }

  const results = await Promise.all(
    sourceNames.map((sourceName) =>
      describeHasTimeField({
        client,
        sourceName,
        projectRouting: effectiveProjectRouting,
        logger,
      })
    )
  );
  return { timeField: results.every(Boolean) ? ES_TIMESTAMP_FIELD_NAME : undefined };
};

export const registerGetTimeFieldRoute = (
  router: IRouter,
  { logger }: PluginInitializerContext
) => {
  router.post(
    {
      path: TIMEFIELD_ROUTE,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {
        body: schema.object({
          query: schema.string({ maxLength: 1000000 }),
          projectRouting: schema.maybe(schema.string({ maxLength: 10000 })),
        }),
      },
    },
    async (requestHandlerContext, request, response) => {
      const { query, projectRouting } = request.body;

      if (getMaxNestingDepth(query) > MAX_NESTING_DEPTH) {
        return response.badRequest({
          body: 'Query nesting depth exceeds the maximum allowed limit',
        });
      }

      const core = await requestHandlerContext.core;
      const client = core.elasticsearch.client.asCurrentUser;

      try {
        const body = await resolveTimeField(client, query, logger.get(), projectRouting);
        esqlRouteRequestCounter.add(1, {
          route: 'timefield',
          outcome: 'success',
          'http.response.status_code': 200,
        });
        return response.ok({ body });
      } catch (error) {
        esqlRouteRequestCounter.add(1, {
          route: 'timefield',
          outcome: 'failure',
          'http.response.status_code': getErrorStatusCode(error),
        });
        throw error;
      }
    }
  );
};
