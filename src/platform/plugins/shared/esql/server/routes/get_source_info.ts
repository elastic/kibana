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
import { getNamedParams } from '@kbn/esql-utils';
import { SOURCE_INFO_ROUTE } from '@kbn/esql-types';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { esqlRouteRequestCounter, getErrorStatusCode } from '../metrics';
import {
  DATASET_FILTERING_FEATURE_FLAG_KEY,
  getMaxNestingDepth,
  MAX_NESTING_DEPTH,
  resolveTimeField,
} from './get_timefield';

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
      const { query, projectRouting, timeRange, esqlVariables } = request.body;

      if (getMaxNestingDepth(query) > MAX_NESTING_DEPTH) {
        return response.badRequest({
          body: 'Query nesting depth exceeds the maximum allowed limit',
        });
      }

      const core = await requestHandlerContext.core;
      const client = core.elasticsearch.client.asCurrentUser;
      const datasetFilteringEnabled = await core.featureFlags.getBooleanValue(
        DATASET_FILTERING_FEATURE_FLAG_KEY,
        false
      );
      try {
        const namedParams = getNamedParams(
          query,
          timeRange,
          esqlVariables as ESQLControlVariable[] | undefined
        );

        const [timeFieldResult, columnsResult] = await Promise.all([
          resolveTimeField(
            client,
            query,
            logger.get(),
            datasetFilteringEnabled,
            projectRouting
          ).catch(() => ({ timeField: undefined })),
          client.esql
            .query({
              query: `${query} | LIMIT 0`,
              ...(namedParams.length ? { params: namedParams } : {}),
              ...(projectRouting ? { project_routing: projectRouting } : {}),
            })
            .catch(() => ({ columns: [] as Array<{ name: string; type: string }> })),
        ]);

        const columns = (columnsResult.columns ?? []).map(
          ({ name, type }: { name: string; type: string }) => ({ name, esType: type })
        );

        esqlRouteRequestCounter.add(1, {
          route: 'source_info',
          outcome: 'success',
          'http.response.status_code': 200,
        });
        return response.ok({ body: { timeField: timeFieldResult.timeField, columns } });
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
