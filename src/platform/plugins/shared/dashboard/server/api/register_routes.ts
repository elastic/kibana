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

import { ItemResult } from '@kbn/content-management-plugin/common/rpc/types';
import { CONTENT_ID, LATEST_VERSION } from '../../common/content_management';
import { INTERNAL_API_VERSION, PUBLIC_API_PATH } from './constants';
import {
  dashboardAttributesSchema,
  dashboardGetResultSchema,
  dashboardCreateResultSchema,
  dashboardSearchResultsSchema,
  referenceSchema,
  DashboardItem,
} from '../content_management/v1';

interface RegisterAPIRoutesArgs {
  http: HttpServiceSetup;
  contentManagement: ContentManagementServerSetup;
  restCounter?: UsageCounter;
  logger: Logger;
}

const commonRouteConfig = {
  // This route is in development and not yet intended for public use.
  access: 'internal',
  /**
   * `enableQueryVersion` is a temporary solution for testing internal endpoints.
   * Requests to these internal endpoints from Kibana Dev Tools or external clients
   * should include the ?apiVersion=1 query parameter.
   * This will be removed when the API is finalized and moved to a stable version.
   */
  enableQueryVersion: true,
  description:
    'This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
  options: {
    tags: ['oas-tag:Dashboards'],
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      enabled: false,
      reason: 'Relies on Content Client for authorization',
    },
  },
} as const;

export function registerAPIRoutes({
  http,
  contentManagement,
  restCounter,
  logger,
}: RegisterAPIRoutesArgs) {
  const { versioned: versionedRouter } = http.createRouter();

  // Create API route
  const createRoute = versionedRouter.post({
    path: `${PUBLIC_API_PATH}/{id?}`,
    summary: 'Create a dashboard',
    ...commonRouteConfig,
  });

  createRoute.addVersion(
    {
      version: INTERNAL_API_VERSION,
      validate: {
        request: {
          params: schema.object({
            id: schema.maybe(
              schema.string({
                meta: { description: 'A unique identifier for the dashboard.' },
              })
            ),
          }),
          body: dashboardAttributesSchema,
        },
        response: {
          200: {
            body: () => dashboardCreateResultSchema,
          },
        },
      },
    },
    async (ctx, req, res) => {
      const { id } = req.params;
      const { references, spaces: initialNamespaces, ...attributes } = req.body;
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for(CONTENT_ID, LATEST_VERSION);
      let result: ItemResult<DashboardItem>;
      try {
        ({ result } = await client.create(attributes, {
          id,
          references,
          initialNamespaces,
        }));
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 409) {
          return res.conflict({
            body: {
              message: `A dashboard with saved object ID ${id} already exists.`,
            },
          });
        }

        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden();
        }

        return res.badRequest({ body: e });
      }

      return res.ok({ body: result.item });
    }
  );

  // Update API route

  const updateRoute = versionedRouter.put({
    path: `${PUBLIC_API_PATH}/{id}`,
    summary: `Update an existing dashboard`,
    ...commonRouteConfig,
  });

  updateRoute.addVersion(
    {
      version: INTERNAL_API_VERSION,
      validate: {
        request: {
          params: schema.object({
            id: schema.string({
              meta: { description: 'A unique identifier for the dashboard.' },
            }),
          }),
          body: schema.object({
            attributes: dashboardAttributesSchema,
            references: schema.maybe(schema.arrayOf(referenceSchema)),
          }),
        },
        response: {
          200: {
            body: () => dashboardCreateResultSchema,
          },
        },
      },
    },
    async (ctx, req, res) => {
      const { attributes, references } = req.body;
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for(CONTENT_ID, LATEST_VERSION);
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
        return res.badRequest(e.message);
      }
      return res.ok({ body: result });
    }
  );

  // List API route
  const listRoute = versionedRouter.get({
    path: `${PUBLIC_API_PATH}`,
    summary: `Get a list of dashboards`,
    ...commonRouteConfig,
  });

  listRoute.addVersion(
    {
      version: INTERNAL_API_VERSION,
      validate: {
        request: {
          query: schema.object({
            page: schema.number({
              meta: { description: 'The page number to return. Default is "1".' },
              min: 1,
              defaultValue: 1,
            }),
            perPage: schema.number({
              meta: {
                description:
                  'The number of dashboards to display on each page (max 1000). Default is "20".',
              },
              defaultValue: 20,
              min: 1,
              max: 1000,
            }),
          }),
        },
        response: {
          200: {
            body: () =>
              schema.object({
                items: schema.arrayOf(dashboardSearchResultsSchema),
                total: schema.number(),
              }),
          },
        },
      },
    },
    async (ctx, req, res) => {
      const { page, perPage: limit } = req.query;
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for(CONTENT_ID, LATEST_VERSION);
      let result;
      try {
        // TODO add filtering
        ({ result } = await client.search(
          {
            cursor: page.toString(),
            limit,
          },
          {
            fields: ['title', 'description', 'timeRestore'],
          }
        ));
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden();
        }

        return res.badRequest();
      }

      const body = {
        items: result.hits,
        total: result.pagination.total,
      };
      return res.ok({ body });
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
            body: () => dashboardGetResultSchema,
          },
        },
      },
    },
    async (ctx, req, res) => {
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for(CONTENT_ID, LATEST_VERSION);
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

      return res.ok({ body: result });
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
