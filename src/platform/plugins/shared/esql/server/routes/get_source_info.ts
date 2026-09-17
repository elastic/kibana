/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { schema } from '@kbn/config-schema';
import type { IRouter, PluginInitializerContext } from '@kbn/core/server';
import { getNamedParams, fixESQLQueryWithVariables } from '@kbn/esql-utils';
import { SOURCE_INFO_ROUTE } from '@kbn/esql-types';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { buildEsQuery, getTimeZoneFromSettings } from '@kbn/es-query';
import { getTime } from '@kbn/data-plugin/common';
import type { ESQLColumn, ESQLSearchResponse } from '@kbn/es-types';
import { esqlRouteRequestCounter, getErrorStatusCode } from '../metrics';
import { getMaxNestingDepth, MAX_NESTING_DEPTH } from './get_timefield';

const DATE_FORMAT_TZ_SETTING = 'dateFormat:tz';

export const registerGetSourceInfoRoute = (
  router: IRouter,
  { logger }: PluginInitializerContext
) => {
  router.post(
    {
      path: SOURCE_INFO_ROUTE,
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
                value: schema.any(),
                type: schema.string({ maxLength: 100 }),
              }),
              { maxSize: 1000 }
            )
          ),
        }),
      },
    },
    async (requestHandlerContext, request, response) => {
      const { query, projectRouting, timeRange, timeFieldName, esqlVariables } = request.body;

      if (getMaxNestingDepth(query) > MAX_NESTING_DEPTH) {
        return response.badRequest({
          body: 'Query nesting depth exceeds the maximum allowed limit',
        });
      }

      const core = await requestHandlerContext.core;
      const client = core.elasticsearch.client.asCurrentUser;
      try {
        const fixedQuery = fixESQLQueryWithVariables(
          query,
          (esqlVariables as ESQLControlVariable[] | undefined) ?? []
        );

        const namedParams = getNamedParams(
          fixedQuery,
          timeRange,
          esqlVariables as ESQLControlVariable[] | undefined
        );

        const dateFormatTZ = await core.uiSettings.client.get<string>(DATE_FORMAT_TZ_SETTING);
        const timeZone = getTimeZoneFromSettings(dateFormatTZ ?? 'UTC');

        const timeFilter =
          timeRange && timeFieldName
            ? getTime(undefined, timeRange, { fieldName: timeFieldName })
            : undefined;
        const filter = timeFilter
          ? buildEsQuery(undefined, [], [timeFilter], {
              allowLeadingWildcards: true,
              queryStringOptions: {},
              ignoreFilterIfFieldNotInIndex: false,
            })
          : undefined;

        const columnsResult = await client.esql
          .query({
            query: `${fixedQuery} | LIMIT 0`,
            ...(namedParams.length ? { params: namedParams } : {}),
            ...(projectRouting ? { project_routing: projectRouting } : {}),
            ...(filter ? { filter } : {}),
            time_zone: timeZone,
            drop_null_columns: true,
            settings: { column_metadata: true },
          })
          .catch(() => ({
            columns: [] as Array<{ name: string; type: string }>,
            all_columns: undefined,
          }));

        const result = columnsResult as unknown as ESQLSearchResponse;
        const allColumnsRaw: ESQLColumn[] = result.all_columns ?? result.columns ?? [];

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
        return response.ok({ body: { columns } });
      } catch (error) {
        esqlRouteRequestCounter.add(1, {
          route: 'source_info',
          outcome: 'failure',
          'http.response.status_code': getErrorStatusCode(error),
        });
        throw error;
      }
    }
  );
};
