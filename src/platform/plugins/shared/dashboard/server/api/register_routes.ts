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

import { CONTENT_ID } from '../../common/content_management';
import {
  PUBLIC_API_PATH,
  PUBLIC_API_VERSION,
  PUBLIC_API_CONTENT_MANAGEMENT_VERSION,
} from './constants';
import {
  dashboardAttributesSchema,
  dashboardGetResultSchema,
  dashboardCreateResultSchema,
  dashboardSearchResultsSchema,
  referenceSchema,
} from '../content_management/v3';

interface RegisterAPIRoutesArgs {
  http: HttpServiceSetup;
  contentManagement: ContentManagementServerSetup;
  restCounter?: UsageCounter;
  logger: Logger;
}

const TECHNICAL_PREVIEW_WARNING =
  'This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.';

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
    access: 'public',
    summary: 'Create a dashboard',
    description: TECHNICAL_PREVIEW_WARNING,
    options: {
      tags: ['oas-tag:Dashboards'],
      availability: {
        stability: 'experimental',
      },
    },
  });

  createRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      validate: {
        request: {
          params: schema.object({
            id: schema.maybe(
              schema.string({
                meta: { description: 'A unique identifier for the dashboard.' },
              })
            ),
          }),
          body: schema.object({
            attributes: dashboardAttributesSchema,
            references: schema.maybe(schema.arrayOf(referenceSchema)),
            spaces: schema.maybe(schema.arrayOf(schema.string())),
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
      const { id } = req.params;
      const { attributes, references, spaces: initialNamespaces } = req.body;
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for(CONTENT_ID, PUBLIC_API_CONTENT_MANAGEMENT_VERSION);
      let result;
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

        return res.badRequest();
      }

      return res.ok({ body: result });
    }
  );

  // Update API route

  const updateRoute = versionedRouter.put({
    path: `${PUBLIC_API_PATH}/{id}`,
    access: 'public',
    summary: `Update an existing dashboard`,
    description: TECHNICAL_PREVIEW_WARNING,
    options: {
      tags: ['oas-tag:Dashboards'],
      availability: {
        stability: 'experimental',
      },
    },
  });

  updateRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
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
        .for(CONTENT_ID, PUBLIC_API_CONTENT_MANAGEMENT_VERSION);
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

      return res.created({ body: result });
    }
  );

  // List API route
  const listRoute = versionedRouter.get({
    path: `${PUBLIC_API_PATH}`,
    access: 'public',
    summary: `Get a list of dashboards`,
    description: TECHNICAL_PREVIEW_WARNING,
    options: {
      tags: ['oas-tag:Dashboards'],
      availability: {
        stability: 'experimental',
      },
    },
  });

  listRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      validate: {
        request: {
          query: schema.object({
            page: schema.number({
              meta: { description: 'The page number to return. Default is "1".' },
              min: 1,
              defaultValue: 1,
            }),
            perPage: schema.maybe(
              schema.number({
                meta: {
                  description:
                    'The number of dashboards to display on each page (max 1000). Default is "20".',
                },
                defaultValue: 20,
                min: 1,
                max: 1000,
              })
            ),
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
        .for(CONTENT_ID, PUBLIC_API_CONTENT_MANAGEMENT_VERSION);
      let result;
      try {
        // TODO add filtering
        ({ result } = await client.search({ cursor: page.toString(), limit }));
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
    access: 'public',
    summary: `Get a dashboard`,
    description: TECHNICAL_PREVIEW_WARNING,
    options: {
      tags: ['oas-tag:Dashboards'],
      availability: {
        stability: 'experimental',
      },
    },
  });

  getRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
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
        .for(CONTENT_ID, PUBLIC_API_CONTENT_MANAGEMENT_VERSION);
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
    access: 'public',
    summary: `Delete a dashboard`,
    description: TECHNICAL_PREVIEW_WARNING,
    options: {
      tags: ['oas-tag:Dashboards'],
      availability: {
        stability: 'experimental',
      },
    },
  });

  deleteRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
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
        .for(CONTENT_ID, PUBLIC_API_CONTENT_MANAGEMENT_VERSION);
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
