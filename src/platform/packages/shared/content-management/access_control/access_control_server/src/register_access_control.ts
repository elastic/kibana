/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import { schema } from '@kbn/config-schema';
import type { CheckGlobalAccessControlPrivilegeDependencies } from './types';

export const registerAccessControl = async ({
  http,
  isAccessControlEnabled,
  getStartServices,
}: CheckGlobalAccessControlPrivilegeDependencies) => {
  const router = http.createRouter();

  router.get(
    {
      path: '/internal/access_control/global_access/{contentTypeId}',
      validate: {
        request: {
          params: schema.object({
            contentTypeId: schema.string(),
          }),
        },
        response: {
          200: {
            body: () =>
              schema.object({
                isGloballyAuthorized: schema.boolean(),
              }),
          },
        },
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route checks access control privileges',
        },
      },
    },
    async (_ctx, request, response) => {
      if (!isAccessControlEnabled) {
        return response.ok({
          body: {
            isGloballyAuthorized: true,
          },
        });
      }

      const { security } = await getStartServices();
      const contentTypeId = request.params.contentTypeId;

      const authorization = security?.authz;

      if (!authorization) {
        return response.ok({
          body: {
            isGloballyAuthorized: false,
          },
        });
      }

      const privileges = {
        kibana: authorization.actions.savedObject.get(contentTypeId, 'manage_access_control'),
      };

      const { hasAllRequested } = await authorization
        .checkPrivilegesWithRequest(request)
        .globally(privileges);

      return response.ok({
        body: {
          isGloballyAuthorized: hasAllRequested,
        },
      });
    }
  );

  router.post(
    {
      path: '/internal/access_control/change_access_mode',
      validate: {
        request: {
          body: schema.object({
            objects: schema.arrayOf(
              schema.object({
                type: schema.string(),
                id: schema.string(),
              })
            ),
            accessMode: schema.oneOf([
              schema.literal('write_restricted'),
              schema.literal('default'),
            ]),
          }),
        },
        response: {
          200: {
            body: () =>
              schema.object({
                results: schema.arrayOf(
                  schema.object({
                    type: schema.string(),
                    id: schema.string(),
                    success: schema.boolean(),
                    error: schema.maybe(
                      schema.object({
                        message: schema.string(),
                        statusCode: schema.number(),
                      })
                    ),
                  })
                ),
              }),
          },
        },
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route changes the access mode of saved objects',
        },
      },
    },
    async (ctx, request, response) => {
      if (!isAccessControlEnabled) {
        return response.badRequest({ body: 'Access control is not enabled' });
      }

      try {
        const core = await ctx.core;
        const { savedObjects } = core;
        const client = savedObjects.getClient();
        const { objects, accessMode } = request.body;

        const result = await client.changeAccessMode(objects, {
          accessMode,
        } as SavedObjectAccessControl);

        return response.ok({
          body: {
            result,
          },
        });
      } catch (error) {
        return response.badRequest({ body: error });
      }
    }
  );

  router.get(
    {
      path: '/internal/access_control/is_enabled',
      validate: {
        request: {},
        response: {
          200: {
            body: () =>
              schema.object({
                isAccessControlEnabled: schema.boolean(),
              }),
          },
        },
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route returns the access control enabled status',
        },
      },
    },
    async (_ctx, request, response) => {
      const { security: securityStart } = await getStartServices();
      const useRbacForRequest = securityStart?.authz.mode.useRbacForRequest(request);
      const enabled = isAccessControlEnabled && useRbacForRequest;
      return response.ok({
        body: {
          isAccessControlEnabled: enabled,
        },
      });
    }
  );
};
