/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/logging';
import type { IRouter } from '@kbn/core-http-server';
import { AuthzDisabled } from '@kbn/core-security-server';
import type {
  CoreRequestHandlerContext,
  RequestHandlerContext,
} from '@kbn/core-http-request-handler-context-server';
import type { UserStorageDefinition } from '@kbn/core-user-storage-common';
import { USER_STORAGE_SO_TYPE, USER_STORAGE_GLOBAL_SO_TYPE } from '../saved_objects';
import { UserStorageClient } from '../user_storage_client';

const FORBIDDEN_MESSAGE = 'User profile not available';

const isUnregisteredKeyError = (err: unknown): err is Error =>
  err instanceof Error && err.message.includes('is not registered');

interface RegisterRoutesParams {
  router: IRouter<RequestHandlerContext>;
  definitions: ReadonlyMap<string, UserStorageDefinition>;
  logger: Logger;
}

const getSoClient = (coreCtx: CoreRequestHandlerContext) =>
  coreCtx.savedObjects.getClient({
    includedHiddenTypes: [USER_STORAGE_SO_TYPE, USER_STORAGE_GLOBAL_SO_TYPE],
  });

const createClientOrNull = (
  coreCtx: CoreRequestHandlerContext,
  params: { definitions: ReadonlyMap<string, UserStorageDefinition>; logger: Logger }
): UserStorageClient | null => {
  const profileUid = coreCtx.security.authc.getCurrentUser()?.profile_uid;
  if (!profileUid) return null;
  return new UserStorageClient({
    savedObjectsClient: getSoClient(coreCtx),
    profileUid,
    definitions: params.definitions,
    logger: params.logger,
  });
};

export const registerRoutes = ({ router, definitions, logger }: RegisterRoutesParams) => {
  router.get(
    {
      path: '/internal/user_storage',
      validate: false,
      security: {
        authz: AuthzDisabled.delegateToSOClient,
      },
    },
    async (requestHandlerContext, _request, response) => {
      const coreCtx = await requestHandlerContext.core;
      const client = createClientOrNull(coreCtx, { definitions, logger });
      if (!client) return response.forbidden({ body: { message: FORBIDDEN_MESSAGE } });

      const values = await client.getAll();
      return response.ok({ body: values });
    }
  );

  router.put(
    {
      path: '/internal/user_storage/{key}',
      validate: {
        params: z.object({ key: z.string() }),
        body: z.object({ value: z.unknown() }),
      },
      security: {
        authz: AuthzDisabled.delegateToSOClient,
      },
    },
    async (requestHandlerContext, request, response) => {
      const coreCtx = await requestHandlerContext.core;
      const client = createClientOrNull(coreCtx, { definitions, logger });
      if (!client) return response.forbidden({ body: { message: FORBIDDEN_MESSAGE } });

      const { key } = request.params;
      const { value } = request.body;

      try {
        await client.set(key, value);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return response.badRequest({ body: { message: `Validation failed: ${err.message}` } });
        }
        if (isUnregisteredKeyError(err)) {
          return response.badRequest({ body: { message: err.message } });
        }
        throw err;
      }

      return response.ok({ body: {} });
    }
  );

  router.delete(
    {
      path: '/internal/user_storage/{key}',
      validate: {
        params: z.object({ key: z.string() }),
      },
      security: {
        authz: AuthzDisabled.delegateToSOClient,
      },
    },
    async (requestHandlerContext, request, response) => {
      const coreCtx = await requestHandlerContext.core;
      const client = createClientOrNull(coreCtx, { definitions, logger });
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
