/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { IRouter, KibanaRequest } from '@kbn/core-http-server';
import { AuthzDisabled } from '@kbn/core-security-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { IUserStorageClient } from '@kbn/core-user-storage-common';

const FORBIDDEN_MESSAGE = 'User profile not available';

const isUnregisteredKeyError = (err: unknown): err is Error =>
  err instanceof Error && err.message.includes('is not registered');

export interface RegisterRoutesParams {
  router: IRouter<RequestHandlerContext>;
  /**
   * Returns a scoped client for the given request, or `null` when the request
   * has no user profile (e.g. API-key auth). Supplied by the service at start
   * time so that namespace resolution is handled in one place.
   */
  getClient: (request: KibanaRequest) => IUserStorageClient | null;
}

export const registerRoutes = ({ router, getClient }: RegisterRoutesParams) => {
  router.get(
    {
      path: '/internal/user_storage/{key}',
      validate: {
        params: z.object({ key: z.string().max(1024) }),
      },
      security: {
        authz: AuthzDisabled.delegateToSOClient,
      },
    },
    async (_requestHandlerContext, request, response) => {
      const client = getClient(request);
      if (!client) return response.forbidden({ body: { message: FORBIDDEN_MESSAGE } });

      const { key } = request.params;

      try {
        const value = await client.get(key);
        return response.ok({ body: { value } });
      } catch (err) {
        if (isUnregisteredKeyError(err)) {
          return response.badRequest({ body: { message: err.message } });
        }
        throw err;
      }
    }
  );

  router.put(
    {
      path: '/internal/user_storage/{key}',
      validate: {
        params: z.object({ key: z.string().max(1024) }),
        body: z.object({ value: z.unknown() }),
      },
      security: {
        authz: AuthzDisabled.delegateToSOClient,
      },
    },
    async (_requestHandlerContext, request, response) => {
      const client = getClient(request);
      if (!client) return response.forbidden({ body: { message: FORBIDDEN_MESSAGE } });

      const { key } = request.params;
      const { value } = request.body;

      let validated: unknown;
      try {
        validated = await client.set(key, value);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return response.badRequest({ body: { message: `Validation failed: ${err.message}` } });
        }
        if (isUnregisteredKeyError(err)) {
          return response.badRequest({ body: { message: err.message } });
        }
        throw err;
      }

      return response.ok({ body: { value: validated } });
    }
  );

  router.delete(
    {
      path: '/internal/user_storage/{key}',
      validate: {
        params: z.object({ key: z.string().max(1024) }),
      },
      security: {
        authz: AuthzDisabled.delegateToSOClient,
      },
    },
    async (_requestHandlerContext, request, response) => {
      const client = getClient(request);
      if (!client) return response.forbidden({ body: { message: FORBIDDEN_MESSAGE } });

      const { key } = request.params;

      try {
        await client.remove(key);
      } catch (err) {
        if (isUnregisteredKeyError(err)) {
          return response.badRequest({ body: { message: err.message } });
        }
        throw err;
      }

      return response.ok({ body: {} });
    }
  );
};
