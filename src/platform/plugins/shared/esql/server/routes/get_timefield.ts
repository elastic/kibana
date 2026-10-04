/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { createHash } from 'crypto';
import { schema } from '@kbn/config-schema';
import type {
  ElasticsearchClient,
  IRouter,
  PluginInitializerContext,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
} from '@kbn/core/server';
import type { EsqlQueryResponse, FieldCapsResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, LoggerFactory } from '@kbn/logging';
import {
  getIndexPatternFromESQLQuery,
  getProjectRoutingFromEsqlQuery,
  parseTimeFieldFromESQLQuery,
} from '@kbn/esql-utils';
import { Parser, isSubQuery } from '@elastic/esql';
import { TIMEFIELD_ROUTE, TIMEFIELD_GET_MAX_QUERY_LENGTH } from '@kbn/esql-types';
import { EsqlService } from '@kbn/esql-server-utils';
import { esqlRouteRequestCounter, getErrorStatusCode } from '../metrics';

// Same default/"advanced setting" split `data_views`'s `fields` endpoint uses for
// its own stale-while-revalidate caching (`DEFAULT_FIELD_CACHE_FRESHNESS`) - the
// timefield is just as mapping-derived as field-caps data, so it reuses the same
// `data_views:cache_max_age` setting rather than introducing a near-identical one.
// `esql`'s kibana.jsonc lists `dataViews` as a requiredPlugin, so this setting is
// always registered.
const DEFAULT_TIMEFIELD_CACHE_FRESHNESS = 5;

function calculateEtag(bodyAsString: string): string {
  return createHash('sha256').update(bodyAsString).digest('hex');
}

function unwrapEtag(ifNoneMatch: string): string {
  let requestHash = ifNoneMatch.replace(/^"(.+)"$/, '$1');
  if (requestHash.indexOf('-') > -1) {
    requestHash = requestHash.split('-')[0];
  }
  return requestHash;
}

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

const nestingDepthExceededMessage = 'Query nesting depth exceeds the maximum allowed limit';

type TimefieldOutcome =
  | { outcome: 'badRequest' }
  | { outcome: 'success'; body: { timeField: string | undefined } }
  | { outcome: 'failure'; error: unknown };

// Shared by both the GET and POST handlers below - resolution and the
// success/failure metrics counter don't depend on how the request arrived.
const resolveTimefieldForRequest = async (
  requestHandlerContext: RequestHandlerContext,
  logger: LoggerFactory,
  query: string,
  projectRouting: string | undefined
): Promise<TimefieldOutcome> => {
  if (getMaxNestingDepth(query) > MAX_NESTING_DEPTH) {
    return { outcome: 'badRequest' };
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
    return { outcome: 'success', body };
  } catch (error) {
    esqlRouteRequestCounter.add(1, {
      route: 'timefield',
      outcome: 'failure',
      'http.response.status_code': getErrorStatusCode(error),
    });
    return { outcome: 'failure', error };
  }
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
      const result = await resolveTimefieldForRequest(
        requestHandlerContext,
        logger,
        query,
        projectRouting
      );

      if (result.outcome === 'badRequest') {
        return response.badRequest({ body: nestingDepthExceededMessage });
      }
      if (result.outcome === 'failure') {
        throw result.error;
      }
      return response.ok({ body: result.body });
    }
  );

  // GET variant: identical resolution, but cacheable. Kept under
  // TIMEFIELD_GET_MAX_QUERY_LENGTH so query-string encoding never risks hitting a
  // URL-length limit imposed by infrastructure in front of Kibana; callers with a
  // larger payload keep using the POST route above (uncached, as before).
  router.get(
    {
      path: TIMEFIELD_ROUTE,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {
        query: schema.object({
          query: schema.string({ maxLength: TIMEFIELD_GET_MAX_QUERY_LENGTH }),
          projectRouting: schema.maybe(
            schema.string({ maxLength: TIMEFIELD_GET_MAX_QUERY_LENGTH })
          ),
        }),
      },
    },
    async (requestHandlerContext, request, response) => {
      const { query, projectRouting } = request.query;
      const result = await resolveTimefieldForRequest(
        requestHandlerContext,
        logger,
        query,
        projectRouting
      );

      if (result.outcome === 'badRequest') {
        return response.badRequest({ body: nestingDepthExceededMessage });
      }
      if (result.outcome === 'failure') {
        throw result.error;
      }

      return respondWithCacheHeaders(requestHandlerContext, request, response, result.body);
    }
  );
};

const respondWithCacheHeaders = async (
  requestHandlerContext: RequestHandlerContext,
  request: KibanaRequest,
  response: KibanaResponseFactory,
  body: { timeField: string | undefined }
) => {
  const core = await requestHandlerContext.core;
  const uiSettings = core.uiSettings.client;

  const bodyAsString = JSON.stringify(body);
  const etag = calculateEtag(bodyAsString);

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    etag,
  };

  // Cache freshness is configurable in classic environments but not on serverless -
  // same setting `data_views`'s `fields` endpoint already exposes for this exact
  // category of data (mapping-derived, not document-data-derived).
  let cacheMaxAge = DEFAULT_TIMEFIELD_CACHE_FRESHNESS;
  const cacheMaxAgeSetting = await uiSettings.get<number | undefined>('data_views:cache_max_age');
  if (cacheMaxAgeSetting !== undefined) {
    cacheMaxAge = cacheMaxAgeSetting;
  }

  if (cacheMaxAge && body.timeField) {
    const stale = 365 * 24 * 60 * 60 - cacheMaxAge;
    headers['cache-control'] = `private, max-age=${cacheMaxAge}, stale-while-revalidate=${stale}`;
  } else {
    headers['cache-control'] = 'private, no-cache';
  }

  const ifNoneMatch = request.headers['if-none-match'];
  const ifNoneMatchString = Array.isArray(ifNoneMatch) ? ifNoneMatch[0] : ifNoneMatch;
  if (ifNoneMatchString) {
    const requestHash = unwrapEtag(ifNoneMatchString);
    if (etag === requestHash) {
      return response.notModified({ headers });
    }
  }

  return response.ok({ body: bodyAsString, headers });
};
