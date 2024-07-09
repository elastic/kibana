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
import { prettyPrintAndSortKeys } from '@kbn/utils';
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
  getTransforms: () => Record<
    ContentManagementApiVersionsType,
    { inTransform?: (data: unknown) => unknown; outTransform?: (data: unknown) => unknown }
  >;
  restCounter?: UsageCounter;
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
  getTransforms,
  restCounter,
}: RegisterAPIRoutesArgs<P>) {
  const { versioned: versionedRouter } = http.createRouter();

  // TODO add usage collection

  // TODO add authorization checks

  // Create API route
  const createRoute = versionedRouter.post({
    path: `/api/${appName}/${contentId}/`,
    access: 'public',
    description: 'Create an item of type {type}.',
  });

  for (const version of Object.values(contentManagementApiVersions)) {
    createRoute.addVersion(
      {
        version,
        validate: {
          request: {
            body: getSchemas()[version].schema,
          },
          response: {
            200: {
              body: () =>
                getSchemas()[version].schema.extends(
                  {
                    id: schema.maybe(
                      schema.string({ meta: { description: 'The ID of the item' } })
                    ),
                  },
                  {
                    meta: { id: contentId },
                  }
                ),
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
          } = await client.create(req.body));

          const outTransform = getTransforms()[version].outTransform ?? ((data) => data);
          const body = prettyPrintAndSortKeys(outTransform(result), Boolean(req.query.pretty));
          return res.ok({ body });
        } catch (e) {
          // TODO do some error handling
          throw e;
        }
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
          throw e;
        }

        const outTransform = getTransforms()[version].outTransform ?? ((data) => data);
        const transformedResult = outTransform(result);
        const body = recursiveSortObjectByKeys(transformedResult);
        return res.ok({ body });
      }
    );
  }
}
