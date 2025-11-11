/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import type { HttpServiceSetup } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { Logger } from '@kbn/logging';

import { CONTENT_ID, LATEST_VERSION } from '../../common/content_management';
import { commonRouteConfig, INTERNAL_API_VERSION, PUBLIC_API_PATH } from './constants';
import type { DashboardItem } from '../content_management/v1';
import { getDashboardAPIGetResultSchema } from '../content_management/v1';
import {
  getDashboardDataSchema,
  getDashboardUpdateResultSchema,
} from '../content_management/v1/schema';
import { registerCreateRoute } from './create';
import { registerSearchRoute } from './search';

interface RegisterAPIRoutesArgs {
  http: HttpServiceSetup;
  contentManagement: ContentManagementServerSetup;
  restCounter?: UsageCounter;
  logger: Logger;
}

const formatResult = (item: DashboardItem) => {
  const {
    id,
    type,
    attributes,
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
    error,
    managed,
    version,
    // TODO rest contains spaces and namespaces
    // These should not be spread into data and instead be moved to meta
    ...rest
  } = item;
  return {
    id,
    type,
    data: { ...attributes, ...rest },
    meta: { createdAt, updatedAt, createdBy, updatedBy, error, managed, version },
  };
};

export function registerAPIRoutes({
  http,
  contentManagement,
  restCounter,
  logger,
}: RegisterAPIRoutesArgs) {
  const { versioned: versionedRouter } = http.createRouter();

  registerCreateRoute(versionedRouter);
  registerSearchRoute(versionedRouter);
  
  // Update API route

  const updateRoute = versionedRouter.put({
    path: `${PUBLIC_API_PATH}/{id}`,
    summary: `Update an existing dashboard`,
    ...commonRouteConfig,
  });

  updateRoute.addVersion(
    {
      version: INTERNAL_API_VERSION,
      validate: () => ({
        request: {
          params: schema.object({
            id: schema.string({
              meta: { description: 'A unique identifier for the dashboard.' },
            }),
          }),
          body: getDashboardDataSchema(),
        },
        response: {
          200: {
            body: getDashboardUpdateResultSchema,
          },
        },
      }),
    },
    async (ctx, req, res) => {
      const { references, ...attributes } = req.body;
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for<DashboardItem>(CONTENT_ID, LATEST_VERSION);
      let result;
      try {
        ({ result } = await client.update(req.params.id, attributes, { references }));
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 404) {
          return res.notFound({
            body: {
              message: `A dashboard with saved object ID ${req.params.id} was not found.`,
            },
          });
        }
        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden();
        }
        return res.badRequest({ body: e.output.payload });
      }

      const formattedResult = formatResult(result.item);
      return res.ok({
        body: { ...formattedResult, meta: { ...formattedResult.meta, ...result.meta } },
      });
    }
  );

  // Get API route
  const getRoute = versionedRouter.get({
    path: `${PUBLIC_API_PATH}/{id}`,
    summary: `Get a dashboard`,
    ...commonRouteConfig,
  });

  getRoute.addVersion(
    {
      version: INTERNAL_API_VERSION,
      validate: {
        request: {
          params: schema.object({
            id: schema.string({
              meta: {
                description: 'A unique identifier for the dashboard.',
              },
            }),
          }),
        },
        response: {
          200: {
            body: getDashboardAPIGetResultSchema,
          },
        },
      },
    },
    async (ctx, req, res) => {
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for<DashboardItem>(CONTENT_ID, LATEST_VERSION);
      let result;
      try {
        ({ result } = await client.get(req.params.id));
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 404) {
          return res.notFound({
            body: {
              message: `A dashboard with saved object ID ${req.params.id}] was not found.`,
            },
          });
        }

        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden();
        }

        return res.badRequest(e.message);
      }
      const formattedResult = formatResult(result.item);
      return res.ok({
        body: { ...formattedResult, meta: { ...formattedResult.meta, ...result.meta } },
      });
    }
  );

  // Delete API route
  const deleteRoute = versionedRouter.delete({
    path: `${PUBLIC_API_PATH}/{id}`,
    summary: `Delete a dashboard`,
    ...commonRouteConfig,
  });

  deleteRoute.addVersion(
    {
      version: INTERNAL_API_VERSION,
      validate: {
        request: {
          params: schema.object({
            id: schema.string({
              meta: {
                description: 'A unique identifier for the dashboard.',
              },
            }),
          }),
        },
      },
    },
    async (ctx, req, res) => {
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for(CONTENT_ID, LATEST_VERSION);
      try {
        await client.delete(req.params.id);
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 404) {
          return res.notFound({
            body: {
              message: `A dashboard with saved object ID ${req.params.id} was not found.`,
            },
          });
        }
        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden();
        }
        return res.badRequest();
      }

      return res.ok();
    }
  );
}
