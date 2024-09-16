/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ObjectType, Props, schema } from '@kbn/config-schema';
import { type ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import { VersionedRouteResponseValidation } from '@kbn/core-http-server';
import { HttpServiceSetup } from '@kbn/core/server';
import { type UsageCounter } from '@kbn/usage-collection-plugin/server';
import { Logger } from '@kbn/logging';
import { baseGetSchema, contentManagementApiVersions } from './constants';
import { ContentManagementApiVersionsType } from './types';

interface RegisterAPIRoutesArgs<P extends Props> {
  http: HttpServiceSetup;
  contentManagement: ContentManagementServerSetup;
  appName: string;
  contentId: string;
  getSchemas: () => Record<
    ContentManagementApiVersionsType,
    { schema: ObjectType<P>; validation?: VersionedRouteResponseValidation }
  >;
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

export function registerAPIRoutes<P extends Props>({
  http,
  contentManagement,
  appName,
  contentId,
  getSchemas,
  restCounter,
  logger,
}: RegisterAPIRoutesArgs<P>) {
  const { versioned: versionedRouter } = http.createRouter();

  // TODO add usage collection

  // TODO add authorization checks

  // Create API route
  const createRoute = versionedRouter.post({
    path: `/api/${appName}/${contentId}/{id?}`,
    access: 'public',
    description: `Create an item of type ${contentId}.`,
  });

  for (const version of Object.values(contentManagementApiVersions)) {
    createRoute.addVersion(
      {
        version,
        validate: {
          request: {
            params: schema.object({
              id: schema.maybe(schema.string()),
            }),
            query: schema.object({
              overwrite: schema.boolean({ defaultValue: false }),
            }),
            body: schema.object({
              attributes: getSchemas()[version].schema,
              references: schema.maybe(schema.arrayOf(schema.any())),
              spaces: schema.maybe(schema.arrayOf(schema.string())),
            }),
          },
          response: {
            200: {
              body: () =>
                baseGetSchema.extends({
                  attributes: getSchemas()[version].schema,
                }),
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
          .for(contentId);
        let result;
        try {
          ({
            result: { item: result },
          } = await client.create(attributes, { id, overwrite, references, initialNamespaces }));
        } catch (e) {
          // TODO do some error handling
          logger.error(e);
          throw e;
        }

        const body = recursiveSortObjectByKeys(result);
        return res.ok({ body });
      }
    );
  }

  // Update API route

  const updateRoute = versionedRouter.put({
    path: `/api/${appName}/${contentId}/{id}`,
    access: 'public',
    description: `Update an item of type ${contentId}.`,
  });

  for (const version of Object.values(contentManagementApiVersions)) {
    updateRoute.addVersion(
      {
        version,
        validate: {
          request: {
            params: schema.object({
              id: schema.string(),
            }),
            body: getSchemas()[version].schema,
          },
          response: {
            200: {
              body: () =>
                baseGetSchema.extends({
                  attributes: getSchemas()[version].schema,
                }),
            },
          },
        },
      },
      async (ctx, req, res) => {
        const client = contentManagement.contentClient
          .getForRequest({ request: req, requestHandlerContext: ctx })
          .for(contentId);
        let result;
        try {
          ({
            result: { item: result },
          } = await client.update(req.params.id, req.body, {}));
        } catch (e) {
          // TODO do some error handling
          logger.error(e);
          throw e;
        }

        const body = recursiveSortObjectByKeys(result);
        return res.ok({ body });
      }
    );
  }

  // List API route
  const listRoute = versionedRouter.get({
    path: `/api/${appName}/${contentId}`,
    access: 'public',
    description: `List items of type ${contentId}.`,
  });

  for (const version of Object.values(contentManagementApiVersions)) {
    listRoute.addVersion(
      {
        version,
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
                  items: schema.arrayOf(
                    baseGetSchema.extends({
                      attributes: schema.any(),
                    })
                  ),
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
          .for(contentId);
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
  }

  // Get API route
  const getRoute = versionedRouter.get({
    path: `/api/${appName}/${contentId}/{id}`,
    access: 'public',
    description: `Get an item of type ${contentId}.`,
  });

  for (const version of Object.values(contentManagementApiVersions)) {
    getRoute.addVersion(
      {
        version,
        validate: {
          request: {
            params: schema.object({
              id: schema.string(),
            }),
          },
          response: {
            200: {
              body: () =>
                baseGetSchema.extends({
                  attributes: getSchemas()[version].schema,
                }),
            },
          },
        },
      },
      async (ctx, req, res) => {
        const client = contentManagement.contentClient
          .getForRequest({ request: req, requestHandlerContext: ctx })
          .for(contentId);
        let result;
        try {
          ({
            result: { item: result },
          } = await client.get(req.params.id));
        } catch (e) {
          // TODO do some error handling
          logger.error(e);
          throw e;
        }

        const body = recursiveSortObjectByKeys(result);
        return res.ok({ body });
      }
    );
  }

  // Delete API route
  const deleteRoute = versionedRouter.delete({
    path: `/api/${appName}/${contentId}/{id}`,
    access: 'public',
    description: `Delete an item of type ${contentId}.`,
  });

  for (const version of Object.values(contentManagementApiVersions)) {
    deleteRoute.addVersion(
      {
        version,
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
          .for(contentId);
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
}
