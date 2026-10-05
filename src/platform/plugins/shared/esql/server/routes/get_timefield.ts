/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { schema } from '@kbn/config-schema';
import type {
  ElasticsearchClient,
  IKibanaResponse,
  IRouter,
  KibanaRequest,
  KibanaResponseFactory,
  PluginInitializerContext,
  RequestHandlerContext,
} from '@kbn/core/server';
import type { EsqlQueryResponse, FieldCapsResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, LoggerFactory } from '@kbn/logging';
import {
  getIndexPatternFromESQLQuery,
  getProjectRoutingFromEsqlQuery,
  parseTimeFieldFromESQLQuery,
} from '@kbn/esql-utils';
import { Parser, isSubQuery } from '@elastic/esql';
import { TIMEFIELD_ROUTE, ESQL_CACHEABLE_GET_MAX_QUERY_LENGTH } from '@kbn/esql-types';
import { EsqlService } from '@kbn/esql-server-utils';
import { respondWithSwrCache } from '@kbn/http-swr-cache';
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

const hasTimestampInFieldCapsResponse = (result: FieldCapsResponse) =>
  Boolean(result.fields && result.fields['@timestamp']);

const getEsqlColumnsForSource = async ({
  client,
  sourceName,
  projectRouting,
}: {
  client: ElasticsearchClient;
  sourceName: string;
  projectRouting: string | undefined;
}): Promise<EsqlQueryResponse | undefined> => {
  // Limit 0 is used to get the schema, more performant
  const query = `FROM ${sourceName} | LIMIT 0`;

  try {
    return await client.esql.query({
      query,
      ...(projectRouting ? { project_routing: projectRouting } : {}),
    });
  } catch {
    // ignore
  }
};

const checkViewLikeSourceForTimestamp = async ({
  client,
  sourceName,
  projectRouting,
}: {
  client: ElasticsearchClient;
  sourceName: string;
  projectRouting: string | undefined;
}): Promise<boolean> => {
  // ES|QL views are resolved by ES|QL itself, and their schema is the output schema.
  const esqlResp = await getEsqlColumnsForSource({ client, sourceName, projectRouting });
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
  const subqueryArgs = sourceCommand.args.filter(isSubQuery);
  const hasSubqueries = subqueryArgs.length > 0;
  const service = new EsqlService({ client });
  const { views } = await service.getViews().catch((viewsError) => {
    const message = viewsError instanceof Error ? viewsError.message : String(viewsError);
    logger.error(`Failed to fetch ES|QL views while resolving timefield: ${message}`, {
      tags: ['esql', 'timefield', 'views'],
      error: {
        stack_trace: viewsError instanceof Error ? viewsError.stack : undefined,
      },
    });
    return { views: [] };
  });
  const viewNames = new Set(views.map(({ name }) => name));
  const splitSources = sources
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const { datasets } = await service.getDatasets().catch(() => ({ datasets: [] }));
  const datasetNames = new Set(datasets.map(({ name }) => name));
  const datasetSources = splitSources.filter((name) => datasetNames.has(name));
  if (datasetSources.length > 0) {
    const datasetChecks = await Promise.all(
      datasetSources.map((sourceName) =>
        checkViewLikeSourceForTimestamp({
          client,
          sourceName,
          projectRouting: effectiveProjectRouting,
        })
      )
    );
    if (datasetChecks.every(Boolean)) {
      return { timeField: ES_TIMESTAMP_FIELD_NAME };
    }
  }

  try {
    // In case of subqueries we need to check all indices separately.
    // Otherwise, pass the full sources string to fieldCaps so Elasticsearch
    // evaluates the multi-index pattern holistically.
    const indices = hasSubqueries ? splitSources : [sources];

    if (!indices.length) {
      return { timeField: undefined };
    }

    const fieldCapsResults = await Promise.all(
      indices.map(async (index) => {
        try {
          const fieldCapsResp = await client.fieldCaps({
            index,
            fields: '@timestamp',
            include_unmapped: false,
            ...(effectiveProjectRouting ? { project_routing: effectiveProjectRouting } : {}),
          });
          return hasTimestampInFieldCapsResponse(fieldCapsResp);
        } catch (fieldCapsError) {
          const message =
            fieldCapsError instanceof Error ? fieldCapsError.message : String(fieldCapsError);
          logger.error(
            `fieldCaps check failed for index "${index}" while resolving ES|QL timefield: ${message}`,
            {
              tags: ['esql', 'timefield', 'fieldCaps'],
              error: {
                stack_trace: fieldCapsError instanceof Error ? fieldCapsError.stack : undefined,
              },
            }
          );
          return false;
        }
      })
    );

    const allHaveTimestamp = fieldCapsResults.every(Boolean);

    if (allHaveTimestamp) {
      return { timeField: ES_TIMESTAMP_FIELD_NAME };
    }

    // fieldCaps didn't find @timestamp — check if any sources are views
    const viewSources = splitSources.filter((name) => viewNames.has(name));

    if (viewSources.length) {
      const viewChecks = await Promise.all(
        viewSources.map((viewName) =>
          checkViewLikeSourceForTimestamp({
            client,
            sourceName: viewName,
            projectRouting: effectiveProjectRouting,
          })
        )
      );
      if (viewChecks.every(Boolean)) {
        return { timeField: ES_TIMESTAMP_FIELD_NAME };
      }
    }

    return { timeField: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to resolve ES|QL timefield: ${message}`, {
      tags: ['esql', 'timefield'],
      error: { stack_trace: error instanceof Error ? error.stack : undefined },
    });
    throw error;
  }
};

const security = {
  authz: {
    enabled: false,
    reason: 'This route delegates authorization to the scoped ES client',
  },
} as const;

// Shared by the POST and GET routes, which differ only in where the params come from and
// whether the response is HTTP-cacheable.
const handleTimeFieldRequest = async ({
  context,
  request,
  response,
  logger,
  query,
  projectRouting,
  cacheable,
}: {
  context: RequestHandlerContext;
  request: KibanaRequest;
  response: KibanaResponseFactory;
  logger: LoggerFactory;
  query: string;
  projectRouting?: string;
  cacheable: boolean;
}): Promise<IKibanaResponse> => {
  if (getMaxNestingDepth(query) > MAX_NESTING_DEPTH) {
    return response.badRequest({
      body: 'Query nesting depth exceeds the maximum allowed limit',
    });
  }

  const core = await context.core;
  const client = core.elasticsearch.client.asCurrentUser;

  let body: { timeField: string | undefined };
  try {
    body = await resolveTimeField(client, query, logger.get(), projectRouting);
    esqlRouteRequestCounter.add(1, {
      route: 'timefield',
      outcome: 'success',
      'http.response.status_code': 200,
    });
  } catch (error) {
    esqlRouteRequestCounter.add(1, {
      route: 'timefield',
      outcome: 'failure',
      'http.response.status_code': getErrorStatusCode(error),
    });
    throw error;
  }

  if (!cacheable) {
    return response.ok({ body });
  }
  // A missing time field may be added by a mapping change soon, so don't cache it.
  return respondWithSwrCache({
    context,
    request,
    response,
    body,
    cacheable: Boolean(body.timeField),
  });
};

export const registerGetTimeFieldRoute = (
  router: IRouter,
  { logger }: PluginInitializerContext
) => {
  router.post(
    {
      path: TIMEFIELD_ROUTE,
      security,
      validate: {
        body: schema.object({
          query: schema.string({ maxLength: 1000000 }),
          projectRouting: schema.maybe(schema.string({ maxLength: 10000 })),
        }),
      },
    },
    (context, request, response) =>
      handleTimeFieldRequest({
        context,
        request,
        response,
        logger,
        ...request.body,
        cacheable: false,
      })
  );

  // Cacheable variant for queries short enough to fit in a URL, see ESQL_CACHEABLE_GET_MAX_QUERY_LENGTH.
  router.get(
    {
      path: TIMEFIELD_ROUTE,
      security,
      validate: {
        query: schema.object({
          query: schema.string({ maxLength: ESQL_CACHEABLE_GET_MAX_QUERY_LENGTH }),
          projectRouting: schema.maybe(
            schema.string({ maxLength: ESQL_CACHEABLE_GET_MAX_QUERY_LENGTH })
          ),
        }),
      },
    },
    (context, request, response) =>
      handleTimeFieldRequest({
        context,
        request,
        response,
        logger,
        ...request.query,
        cacheable: true,
      })
  );
};
