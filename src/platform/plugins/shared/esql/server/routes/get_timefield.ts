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
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { FieldCapsResponse } from '@elastic/elasticsearch/lib/api/types';
import { getIndexPatternFromESQLQuery, getTimeFieldFromESQLQuery } from '@kbn/esql-utils';
import { Parser } from '@kbn/esql-language';
import { TIMEFIELD_ROUTE } from '@kbn/esql-types';
import { EsqlService } from '../services/esql_service';

const ES_TIMESTAMP_FIELD_NAME = '@timestamp';

const hasTimestampInFieldCapsResponse = (result: FieldCapsResponse) =>
  Boolean(result.fields && result.fields['@timestamp']);

const toDebugString = (error: unknown): string =>
  error instanceof Error ? error.stack ?? error.message : String(error);

const getEsqlColumnsForSource = async ({
  client,
  sourceName,
}: {
  client: ElasticsearchClient;
  sourceName: string;
}): Promise<ESQLSearchResponse | undefined> => {
  // Limit 0 is used to get the schema, more performant
  const query = `FROM ${sourceName} | LIMIT 0`;

  try {
    return await client.transport.request<ESQLSearchResponse>({
      method: 'POST',
      path: '/_query',
      body: { query },
    });
  } catch {
    // ignore
  }
};

const checkViewLikeSourceForTimestamp = async ({
  client,
  sourceName,
}: {
  client: ElasticsearchClient;
  sourceName: string;
}): Promise<boolean> => {
  // ES|QL views are resolved by ES|QL itself, and their schema is the output schema.
  const esqlResp = await getEsqlColumnsForSource({ client, sourceName });
  return Boolean(esqlResp?.columns?.some((col) => col.name === ES_TIMESTAMP_FIELD_NAME));
};

/**
 * Registers the ESQL get timefield route.
 * This route returns the timefield to use for the ES|QL ad-hoc dataview.
 *
 * The timefield is extracted from the ES|QL query if specified.
 * If not specified, it checks if the index pattern contains the default time field '@timestamp'.
 * In case of subqueries, it verifies that all involved indices contain the '@timestamp' field.
 * @param router The IRouter instance to register the route with.
 * @param logger The logger instance from the PluginInitializerContext.
 *
 * @returns timeField or undefined
 */
export const registerGetTimeFieldRoute = (
  router: IRouter,
  { logger }: PluginInitializerContext
) => {
  router.get(
    {
      path: `${TIMEFIELD_ROUTE}{query}`,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {
        params: schema.object({
          query: schema.string(),
        }),
      },
    },
    async (requestHandlerContext, request, response) => {
      const { query } = request.params;

      // Query is of the form "from index | where timefield >= ?_tstart".
      // At this point we just want to extract the timefield if present in the query
      const timeField = getTimeFieldFromESQLQuery(query);
      if (timeField) {
        return response.ok({
          body: { timeField },
        });
      }
      const core = await requestHandlerContext.core;
      const client = core.elasticsearch.client.asCurrentUser;

      // Trying to identify if there is @timestamp
      const { root } = Parser.parse(query);
      const sourceCommand = root.commands.find(({ name }) => ['from', 'ts'].includes(name));
      if (!sourceCommand) {
        return response.ok({
          body: { timeField: undefined },
        });
      }
      const sources = getIndexPatternFromESQLQuery(query);
      const service = new EsqlService({ client: core.elasticsearch.client.asCurrentUser });
      const { views } = await service.getViews().catch(() => ({ views: [] }));
      const viewNames = new Set(views.map(({ name }) => name));

      try {
        const indices = sources
          .split(',')
          .map((index) => index.trim())
          .filter(Boolean);

        if (!indices.length) {
          return response.ok({
            body: { timeField: undefined },
          });
        }

        const sourceChecks = await Promise.all(
          indices.map(async (sourceName) => {
            // If ES tells us it's a view, skip fieldCaps and inspect the ES|QL schema instead.
            // This is temporary until we have a proper way to detect the time field for ES|QL views using field caps.
            if (viewNames.has(sourceName)) {
              return checkViewLikeSourceForTimestamp({ client, sourceName });
            }

            try {
              const fieldCapsResp = await client.fieldCaps({
                index: sourceName,
                fields: '@timestamp',
                include_unmapped: false,
              });
              return hasTimestampInFieldCapsResponse(fieldCapsResp);
            } catch (fieldCapsError) {
              logger.get().debug(toDebugString(fieldCapsError));
            }
          })
        );

        return response.ok({
          body: { timeField: sourceChecks.every(Boolean) ? '@timestamp' : undefined },
        });
      } catch (error) {
        logger.get().debug(toDebugString(error));
        throw error;
      }
    }
  );
};
