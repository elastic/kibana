/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { schema, type TypeOf } from '@kbn/config-schema';
import type {
  IKibanaResponse,
  IRouter,
  KibanaRequest,
  KibanaResponseFactory,
  PluginInitializerContext,
  RequestHandlerContext,
} from '@kbn/core/server';
import type { LoggerFactory } from '@kbn/logging';
import { respondWithSwrCache } from '@kbn/http-swr-cache';
import { getNamedParams, fixESQLQueryWithVariables } from '@kbn/esql-utils';
import {
  ESQL_CACHEABLE_GET_MAX_QUERY_LENGTH,
  ESQLVariableType,
  SOURCE_INFO_ROUTE,
} from '@kbn/esql-types';
import { buildEsQuery, getTimeZoneFromSettings } from '@kbn/es-query';
import { getTime, getEsQueryConfig } from '@kbn/data-plugin/common';
import type { ESQLColumn, ESQLSearchResponse } from '@kbn/es-types';
import { esqlRouteRequestCounter, getErrorStatusCode } from '../metrics';
import { getMaxNestingDepth, MAX_NESTING_DEPTH } from './get_timefield';

const DATE_FORMAT_TZ_SETTING = 'dateFormat:tz';

const esqlVariableValueSchema = schema.oneOf([
  schema.string({ maxLength: 10000 }),
  schema.number(),
  schema.arrayOf(schema.oneOf([schema.string({ maxLength: 10000 }), schema.number()]), {
    maxSize: 1000,
  }),
]);

const esqlVariableTypeSchema = schema.oneOf([
  schema.literal(ESQLVariableType.TIME_LITERAL),
  schema.literal(ESQLVariableType.FIELDS),
  schema.literal(ESQLVariableType.VALUES),
  schema.literal(ESQLVariableType.MULTI_VALUES),
  schema.literal(ESQLVariableType.FUNCTIONS),
]);

const sourceInfoBodySchema = schema.object({
  query: schema.string({ maxLength: 1000000 }),
  projectRouting: schema.maybe(schema.string({ maxLength: 10000 })),
  timeRange: schema.maybe(
    schema.object({
      from: schema.string({ maxLength: 100 }),
      to: schema.string({ maxLength: 100 }),
    })
  ),
  timeFieldName: schema.maybe(schema.string({ maxLength: 1000 })),
  esqlVariables: schema.maybe(
    schema.arrayOf(
      schema.object({
        key: schema.string({ maxLength: 1000 }),
        value: esqlVariableValueSchema,
        type: esqlVariableTypeSchema,
      }),
      { maxSize: 1000 }
    )
  ),
});

type SourceInfoBody = TypeOf<typeof sourceInfoBodySchema>;

const security = {
  authz: {
    enabled: false,
    reason: 'This route delegates authorization to the scoped ES client',
  },
} as const;

// Shared by the POST and GET routes, which differ only in where the params come from and
// whether the response is HTTP-cacheable.
const handleSourceInfoRequest = async ({
  context,
  request,
  response,
  logger,
  body: { query, projectRouting, timeRange, timeFieldName, esqlVariables },
  cacheable,
}: {
  context: RequestHandlerContext;
  request: KibanaRequest;
  response: KibanaResponseFactory;
  logger: LoggerFactory;
  body: SourceInfoBody;
  cacheable: boolean;
}): Promise<IKibanaResponse> => {
  if (getMaxNestingDepth(query) > MAX_NESTING_DEPTH) {
    return response.badRequest({
      body: 'Query nesting depth exceeds the maximum allowed limit',
    });
  }

  const core = await context.core;
  const client = core.elasticsearch.client.asCurrentUser;
  try {
    const fixedQuery = fixESQLQueryWithVariables(query, esqlVariables ?? []);

    const namedParams = getNamedParams(fixedQuery, timeRange, esqlVariables);

    const esQueryConfigs = getEsQueryConfig(
      core.uiSettings.client as Parameters<typeof getEsQueryConfig>[0]
    );
    const dateFormatTZ = await core.uiSettings.client.get<string>(DATE_FORMAT_TZ_SETTING);
    const timeZone = getTimeZoneFromSettings(dateFormatTZ ?? 'UTC');

    const timeFilter =
      timeRange && timeFieldName
        ? getTime(undefined, timeRange, { fieldName: timeFieldName })
        : undefined;
    const filter = timeFilter
      ? buildEsQuery(undefined, [], [timeFilter], esQueryConfigs)
      : undefined;

    let columnsResult: Pick<ESQLSearchResponse, 'columns' | 'all_columns'>;
    try {
      columnsResult = (await client.esql.query({
        query: `${fixedQuery}\n| LIMIT 0`,
        ...(namedParams.length ? { params: namedParams } : {}),
        ...(projectRouting ? { project_routing: projectRouting } : {}),
        ...(filter ? { filter } : {}),
        time_zone: timeZone,
        drop_null_columns: true,
        settings: { column_metadata: true },
      })) as unknown as ESQLSearchResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.get().error(`Failed to fetch ES|QL source info columns: ${message}`, {
        tags: ['esql', 'source_info'],
        error: {
          stack_trace: error instanceof Error ? error.stack : undefined,
        },
      });
      throw error;
    }

    const allColumnsRaw: ESQLColumn[] = columnsResult.all_columns ?? columnsResult.columns ?? [];

    const columns = allColumnsRaw.map(({ name, type, original_types, _meta }) => ({
      name,
      esType: type,
      ...(original_types?.length ? { originalTypes: original_types } : {}),
      ...(_meta !== undefined ? { columnMeta: _meta } : {}),
    }));

    esqlRouteRequestCounter.add(1, {
      route: 'source_info',
      outcome: 'success',
      'http.response.status_code': 200,
    });
    if (!cacheable) {
      return response.ok({ body: { columns } });
    }
    return respondWithSwrCache({
      context,
      request,
      response,
      body: { columns },
      cacheable: columns.length > 0,
    });
  } catch (error) {
    esqlRouteRequestCounter.add(1, {
      route: 'source_info',
      outcome: 'failure',
      'http.response.status_code': getErrorStatusCode(error),
    });
    throw error;
  }
};

export const registerGetSourceInfoRoute = (
  router: IRouter,
  { logger }: PluginInitializerContext
) => {
  router.post(
    { path: SOURCE_INFO_ROUTE, security, validate: { body: sourceInfoBodySchema } },
    (context, request, response) =>
      handleSourceInfoRequest({
        context,
        request,
        response,
        logger,
        body: request.body,
        cacheable: false,
      })
  );

  // Cacheable variant: the POST body is sent as a JSON `request` query param, for requests short
  // enough to fit in a URL (see ESQL_CACHEABLE_GET_MAX_QUERY_LENGTH).
  router.get(
    {
      path: SOURCE_INFO_ROUTE,
      security,
      validate: {
        query: schema.object({
          request: schema.string({ maxLength: ESQL_CACHEABLE_GET_MAX_QUERY_LENGTH }),
        }),
      },
    },
    (context, request, response) => {
      let body: SourceInfoBody;
      try {
        body = sourceInfoBodySchema.validate(JSON.parse(request.query.request));
      } catch (error) {
        return response.badRequest({
          body: error instanceof Error ? error.message : String(error),
        });
      }
      return handleSourceInfoRequest({ context, request, response, logger, body, cacheable: true });
    }
  );
};
