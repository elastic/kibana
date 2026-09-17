/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger, PluginInitializerContext } from '@kbn/core/server';
import { VIEWS_BULK_DELETE_ROUTE, VIEWS_ROUTE } from '@kbn/esql-types';
import { esqlRouteRequestCounter, getErrorStatusCode } from '../metrics';

const MAX_VIEW_NAME_LENGTH = 255;
const MAX_VIEW_QUERY_LENGTH = 1_000_000;
const MAX_VIEW_DESCRIPTION_LENGTH = 1_000;
const MAX_VIEWS_PER_CLUSTER = 500;

const viewNameSchema = schema.string({
  minLength: 1,
  maxLength: MAX_VIEW_NAME_LENGTH,
});

const routeSecurity = {
  authz: {
    enabled: false,
    reason: 'This route delegates authorization to the scoped ES client',
  },
} as const;

const reportRouteError = (route: string, action: string, error: unknown, logger: Logger) => {
  const statusCode = getErrorStatusCode(error);
  esqlRouteRequestCounter.add(1, {
    route,
    outcome: 'failure',
    'http.response.status_code': statusCode,
  });
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`Failed to ${action} ES|QL view: ${message}`, {
    tags: ['esql', 'views', action],
    error: { stack_trace: error instanceof Error ? error.stack : undefined },
  });
  return { statusCode, body: { message } };
};

const reportRouteSuccess = (route: string): void => {
  esqlRouteRequestCounter.add(1, {
    route,
    outcome: 'success',
    'http.response.status_code': 200,
  });
};

export const registerViewsManagementRoutes = (
  router: IRouter,
  { logger }: PluginInitializerContext
): void => {
  const pluginLogger = logger.get();

  router.get(
    {
      path: `${VIEWS_ROUTE}/{name}`,
      validate: {
        params: schema.object({ name: viewNameSchema }),
      },
      security: routeSecurity,
      options: {
        description: 'Gets an ES|QL view by name',
      },
    },
    async (requestHandlerContext, request, response) => {
      const { name } = request.params;
      try {
        const core = await requestHandlerContext.core;
        const { views } = await core.elasticsearch.client.asCurrentUser.esql.getView({ name });
        const view = views[0];

        if (!view) {
          return response.notFound({
            body: { message: `ES|QL view "${name}" not found` },
          });
        }

        reportRouteSuccess('views.get');
        return response.ok({ body: view });
      } catch (error) {
        return response.customError(reportRouteError('views.get', 'get', error, pluginLogger));
      }
    }
  );

  router.put(
    {
      path: `${VIEWS_ROUTE}/{name}`,
      validate: {
        params: schema.object({ name: viewNameSchema }),
        body: schema.object({
          query: schema.string({ minLength: 1, maxLength: MAX_VIEW_QUERY_LENGTH }),
          description: schema.maybe(schema.string({ maxLength: MAX_VIEW_DESCRIPTION_LENGTH })),
        }),
      },
      security: routeSecurity,
      options: {
        description: 'Creates or updates an ES|QL view',
      },
    },
    async (requestHandlerContext, request, response) => {
      const { name } = request.params;
      const { query, description } = request.body;
      try {
        const core = await requestHandlerContext.core;
        const result = await core.elasticsearch.client.asCurrentUser.esql.putView({
          name,
          query,
          ...(description === undefined ? {} : { body: { description } }),
        });

        reportRouteSuccess('views.upsert');
        return response.ok({ body: result });
      } catch (error) {
        return response.customError(
          reportRouteError('views.upsert', 'upsert', error, pluginLogger)
        );
      }
    }
  );

  router.delete(
    {
      path: `${VIEWS_ROUTE}/{name}`,
      validate: {
        params: schema.object({ name: viewNameSchema }),
      },
      security: routeSecurity,
      options: {
        description: 'Deletes an ES|QL view',
      },
    },
    async (requestHandlerContext, request, response) => {
      const { name } = request.params;
      try {
        const core = await requestHandlerContext.core;
        const result = await core.elasticsearch.client.asCurrentUser.esql.deleteView({ name });

        reportRouteSuccess('views.delete');
        return response.ok({ body: result });
      } catch (error) {
        return response.customError(
          reportRouteError('views.delete', 'delete', error, pluginLogger)
        );
      }
    }
  );

  router.post(
    {
      path: VIEWS_BULK_DELETE_ROUTE,
      validate: {
        body: schema.object({
          names: schema.arrayOf(viewNameSchema, {
            minSize: 1,
            maxSize: MAX_VIEWS_PER_CLUSTER,
          }),
        }),
      },
      security: routeSecurity,
      options: {
        description: 'Deletes multiple ES|QL views',
      },
    },
    async (requestHandlerContext, request, response) => {
      const { names } = request.body;
      try {
        const core = await requestHandlerContext.core;
        const result = await core.elasticsearch.client.asCurrentUser.esql.deleteView({
          name: names,
        });

        reportRouteSuccess('views.bulk_delete');
        return response.ok({ body: result });
      } catch (error) {
        return response.customError(
          reportRouteError('views.bulk_delete', 'bulk delete', error, pluginLogger)
        );
      }
    }
  );
};
