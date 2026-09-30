/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asCodeIdSchema, getMeta } from '@kbn/as-code-shared-schemas';
import { logRequest, writeErrorHandler } from '@kbn/as-code-utils';
import type { VersionedRouter } from '@kbn/core-http-server';
import { AuthzDisabled } from '@kbn/core-security-server';
import { prettifyError, ZodError } from '@kbn/zod';
import type {
  CoreSetup,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
  RequestHandlerContext,
  SavedObject,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import {
  DISCOVER_SESSION_API_VERSION,
  DISCOVER_SESSION_INTERNAL_API_BASE_PATH,
} from '../../common/constants';
import {
  discoverSessionInternalParamsSchema,
  discoverSessionInternalResponseSchema,
  discoverSessionInternalGetResponseSchema,
  discoverSessionInternalDataSchema,
  type DiscoverSessionInternalResponse,
} from './internal_schema';
import type { DiscoverSessionWarning } from './schema';
import { transformInternalDiscoverSessionIn } from './transforms/transform_discover_session_in';
import { transformInternalDiscoverSessionOut } from './transforms/transform_discover_session_out';
import {
  createStoredDiscoverSession,
  getStoredDiscoverSession,
  resolveStoredDiscoverSession,
  updateStoredDiscoverSession,
} from './stored_session';
import { trackDiscoverSessionAction } from './user_activity';

// These routes stay internal when the as-code API becomes public, so they don't use its access.
const routeConfig = {
  access: 'internal',
  security: { authz: AuthzDisabled.delegateToSOClient },
} as const;

/** Registers as-code routes for Discover that also preserve inline Data View IDs. */
export const registerInternalRoutes = (
  router: VersionedRouter<RequestHandlerContext>,
  userActivity: CoreSetup['userActivity'],
  logger: Logger
) => {
  router
    .post({
      path: DISCOVER_SESSION_INTERNAL_API_BASE_PATH,
      summary: 'Create a Discover session with inline Data View IDs',
      ...routeConfig,
    })
    .addVersion(
      {
        version: DISCOVER_SESSION_API_VERSION,
        validate: {
          request: { body: discoverSessionInternalDataSchema },
          response: {
            201: { body: () => discoverSessionInternalResponseSchema, description: 'Created' },
            400: { description: 'Invalid request' },
            403: { description: 'Forbidden' },
          },
        },
      },
      async (context, request, response) => {
        try {
          const storedSession = transformInternalDiscoverSessionIn(request.body);
          const savedObject = await createStoredDiscoverSession(context, storedSession);
          const { body } = toInternalSessionResponse(savedObject);
          trackDiscoverSessionAction(userActivity, 'create', body);

          return response.created({ body });
        } catch (error) {
          return writeErrorHandler(error, response, logger, request);
        }
      }
    );

  router
    .put({
      path: `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/{id}`,
      summary: 'Upsert a Discover session with inline Data View IDs',
      description:
        'Creates a session with the specified ID, or fully replaces the existing session. Aliases are not resolved.',
      ...routeConfig,
    })
    .addVersion(
      {
        version: DISCOVER_SESSION_API_VERSION,
        validate: {
          request: {
            params: discoverSessionInternalParamsSchema,
            body: discoverSessionInternalDataSchema,
          },
          response: {
            200: { body: () => discoverSessionInternalResponseSchema, description: 'Updated' },
            201: { body: () => discoverSessionInternalResponseSchema, description: 'Created' },
            400: { description: 'Invalid request' },
            403: { description: 'Forbidden' },
            404: { description: 'Not found' },
            409: { description: 'Conflict' },
          },
        },
      },
      async (context, request, response) => {
        const { id } = request.params;

        try {
          const storedSession = transformInternalDiscoverSessionIn(request.body);
          const existing = await getStoredDiscoverSession(context, id);

          if (!existing) {
            // Like the public PUT, validate new IDs without rejecting existing legacy IDs.
            asCodeIdSchema.parse(id);

            const savedObject = await createStoredDiscoverSession(context, storedSession, id);
            const { body } = toInternalSessionResponse(savedObject);
            trackDiscoverSessionAction(userActivity, 'create', body);

            return response.created({ body });
          }

          const savedObject = await updateStoredDiscoverSession(context, id, storedSession);
          const { body } = toInternalSessionResponse(savedObject);
          trackDiscoverSessionAction(userActivity, 'update', body);

          return response.ok({ body });
        } catch (error) {
          return handleSessionError(error, id, logger, request, response);
        }
      }
    );

  router
    .get({
      path: `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/{id}`,
      summary: 'Get a Discover session with inline Data View IDs',
      ...routeConfig,
    })
    .addVersion(
      {
        version: DISCOVER_SESSION_API_VERSION,
        validate: {
          request: { params: discoverSessionInternalParamsSchema },
          response: {
            200: { body: () => discoverSessionInternalGetResponseSchema, description: 'Success' },
            403: { description: 'Forbidden' },
            404: { description: 'Not found' },
            500: { description: 'Internal server error' },
          },
        },
      },
      async (context, request, response) => {
        const { id } = request.params;

        try {
          const { savedObject, resolveHeaders } = await resolveStoredDiscoverSession(context, id);
          const { body, warnings } = toInternalSessionResponse(savedObject);

          return response.ok({
            body: { ...body, ...(warnings.length > 0 && { warnings }) },
            headers: resolveHeaders,
          });
        } catch (error) {
          if (error instanceof ZodError) {
            logRequest(logger, request, 'error', error.stack ?? prettifyError(error));
            throw error;
          }

          return handleSessionError(error, id, logger, request, response);
        }
      }
    );
};

/** Builds the response body and returns conversion warnings separately for GET responses. */
const toInternalSessionResponse = (
  savedObject: SavedObject<DiscoverSessionAttributes>
): { body: DiscoverSessionInternalResponse; warnings: DiscoverSessionWarning[] } => {
  const { sessionState, warnings } = transformInternalDiscoverSessionOut(
    savedObject.attributes,
    savedObject.references
  );

  return {
    body: {
      id: savedObject.id,
      data: sessionState,
      meta: getMeta(savedObject),
    },
    warnings,
  };
};

/** Returns 404 for a missing session and handles other errors like the as-code routes. */
const handleSessionError = (
  error: Error,
  id: string,
  logger: Logger,
  request: KibanaRequest,
  response: KibanaResponseFactory
) => {
  if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
    const message = `A Discover session with ID [${id}] was not found.`;
    logRequest(logger, request, 'debug', message);

    return response.notFound({ body: { message } });
  }

  return writeErrorHandler(error, response, logger, request);
};
