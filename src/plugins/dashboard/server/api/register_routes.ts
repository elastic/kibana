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
} from '../content_management/v3';

interface RegisterAPIRoutesArgs {
  http: HttpServiceSetup;
  contentManagement: ContentManagementServerSetup;
  restCounter?: UsageCounter;
  logger: Logger;
}

function recursiveSortObjectByKeys(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) {
    return obj.map(recursiveSortObjectByKeys);
  }
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = recursiveSortObjectByKeys(obj[key]);
      return acc;
    }, {} as Record<string, unknown>);
}

export function registerAPIRoutes({
  http,
  contentManagement,
  restCounter,
  logger,
}: RegisterAPIRoutesArgs) {
  const { versioned: versionedRouter } = http.createRouter();

  // TODO add usage collection

  // TODO add authorization checks

  // Create API route
  const createRoute = versionedRouter.post({
    path: `${PUBLIC_API_PATH}/{id?}`,
    access: 'public',
    description: `Create a new dashboard.`,
  });

  createRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      validate: {
        request: {
          params: schema.object({
            id: schema.maybe(schema.string()),
          }),
          query: schema.object({
            overwrite: schema.boolean({ defaultValue: false }),
          }),
          body: schema.object({
            attributes: dashboardAttributesSchema,
            references: schema.maybe(schema.arrayOf(schema.any())),
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
      const { overwrite } = req.query;
      const { attributes, references, spaces: initialNamespaces } = req.body;
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for(CONTENT_ID, PUBLIC_API_CONTENT_MANAGEMENT_VERSION);
      let result;
      try {
        ({ result } = await client.create(attributes, {
          id,
          overwrite,
          references,
          initialNamespaces,
        }));
      } catch (e) {
        // TODO do some error handling
        logger.error(e);
        throw e;
      }

      const body = recursiveSortObjectByKeys(result);
      return res.ok({ body });
    }
  );

  // Update API route

  const updateRoute = versionedRouter.put({
    path: `${PUBLIC_API_PATH}/{id}`,
    access: 'public',
    description: `Update an existing dashboard.`,
  });

  updateRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      validate: {
        request: {
          params: schema.object({
            id: schema.string(),
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
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for(CONTENT_ID, PUBLIC_API_CONTENT_MANAGEMENT_VERSION);
      let result;
      try {
        ({ result } = await client.update(req.params.id, req.body, {}));
      } catch (e) {
        // TODO do some error handling
        logger.error(e);
        throw e;
      }

      const body = recursiveSortObjectByKeys(result);
      return res.ok({ body });
    }
  );

  // List API route
  const listRoute = versionedRouter.get({
    path: `${PUBLIC_API_PATH}`,
    access: 'public',
    description: `Get a list of dashboards.`,
  });

  listRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      validate: {
        request: {
          query: schema.object({
            kuery: schema.maybe(schema.string()),
            page: schema.number({ defaultValue: 1 }),
            perPage: schema.maybe(schema.number()),
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
      const { kuery, page, perPage: limit } = req.query;
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for(CONTENT_ID, PUBLIC_API_CONTENT_MANAGEMENT_VERSION);
      let result;
      try {
        // TODO add kuery filtering
        ({ result } = await client.search({ cursor: page.toString(), limit }));
      } catch (e) {
        // TODO do some error handling
        logger.error(e);
        throw e;
      }

      const body = {
        items: result.hits.map((item) => recursiveSortObjectByKeys(item)),
        total: result.pagination.total,
      };
      return res.ok({ body });
    }
  );

  // Get API route
  const getRoute = versionedRouter.get({
    path: `${PUBLIC_API_PATH}/{id}`,
    access: 'public',
    description: `Get a dashboard.`,
  });

  getRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      validate: {
        request: {
          params: schema.object({
            id: schema.string(),
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
        // TODO do some error handling
        logger.error(e);
        throw e;
      }

      const body = recursiveSortObjectByKeys(result);
      return res.ok({ body });
    }
  );

  // Delete API route
  const deleteRoute = versionedRouter.delete({
    path: `${PUBLIC_API_PATH}/{id}`,
    access: 'public',
    description: `Delete a dashboard.`,
  });

  deleteRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      validate: {
        request: {
          params: schema.object({
            id: schema.string(),
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
        // TODO do some error handling
        logger.error(e);
        throw e;
      }

      return res.ok();
    }
  );
}
