/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMeta } from '@kbn/as-code-shared-schemas';
import { toAsCodeTags } from '@kbn/as-code-shared-transforms';
import { logRequest, writeErrorHandler } from '@kbn/as-code-utils';
import type { VersionedRouter } from '@kbn/core-http-server';
import { AuthzDisabled } from '@kbn/core-security-server';
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
  storedDiscoverSessionParamsSchema,
  storedDiscoverSessionResponseSchema,
  storedDiscoverSessionSchema,
} from './internal_schema';
import {
  createStoredDiscoverSession,
  resolveStoredDiscoverSession,
  updateStoredDiscoverSession,
} from './stored_session';
import { trackDiscoverSessionAction } from './user_activity';

// These routes stay internal when the as-code API becomes public, so they don't use its access.
const routeConfig = {
  access: 'internal',
  security: { authz: AuthzDisabled.delegateToSOClient },
} as const;

/** Registers internal routes that read and write Discover sessions in their stored format. */
export const registerInternalRoutes = (
  router: VersionedRouter<RequestHandlerContext>,
  userActivity: CoreSetup['userActivity'],
  logger: Logger
) => {
  router
    .post({
      path: DISCOVER_SESSION_INTERNAL_API_BASE_PATH,
      summary: 'Create a Discover session from its stored format',
      ...routeConfig,
    })
    .addVersion(
      {
        version: DISCOVER_SESSION_API_VERSION,
        validate: {
          request: { body: storedDiscoverSessionSchema },
          response: {
            201: { body: () => storedDiscoverSessionResponseSchema, description: 'Created' },
            400: { description: 'Invalid request' },
            403: { description: 'Forbidden' },
          },
        },
      },
      async (context, request, response) => {
        try {
          const savedObject = await createStoredDiscoverSession(context, request.body);
          trackStoredSessionAction(userActivity, 'create', savedObject);

          return response.created({ body: toStoredSessionResponse(savedObject) });
        } catch (error) {
          return writeErrorHandler(error, response, logger, request);
        }
      }
    );

  router
    .put({
      path: `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/{id}`,
      summary: 'Update a Discover session from its stored format',
      description: 'Replaces an existing session with this exact ID. Aliases are not resolved.',
      ...routeConfig,
    })
    .addVersion(
      {
        version: DISCOVER_SESSION_API_VERSION,
        validate: {
          request: {
            params: storedDiscoverSessionParamsSchema,
            body: storedDiscoverSessionSchema,
          },
          response: {
            200: { body: () => storedDiscoverSessionResponseSchema, description: 'Updated' },
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
          const savedObject = await updateStoredDiscoverSession(context, id, request.body);
          trackStoredSessionAction(userActivity, 'update', savedObject);

          return response.ok({ body: toStoredSessionResponse(savedObject) });
        } catch (error) {
          return handleSessionError(error, id, logger, request, response);
        }
      }
    );

  router
    .get({
      path: `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/{id}`,
      summary: 'Get a Discover session in its stored format',
      ...routeConfig,
    })
    .addVersion(
      {
        version: DISCOVER_SESSION_API_VERSION,
        validate: {
          request: { params: storedDiscoverSessionParamsSchema },
          response: {
            200: { body: () => storedDiscoverSessionResponseSchema, description: 'Success' },
            403: { description: 'Forbidden' },
            404: { description: 'Not found' },
          },
        },
      },
      async (context, request, response) => {
        const { id } = request.params;

        try {
          const { savedObject, resolveHeaders } = await resolveStoredDiscoverSession(context, id);

          return response.ok({
            body: toStoredSessionResponse(savedObject),
            headers: resolveHeaders,
          });
        } catch (error) {
          return handleSessionError(error, id, logger, request, response);
        }
      }
    );
};

const toStoredSessionResponse = (savedObject: SavedObject<DiscoverSessionAttributes>) => ({
  id: savedObject.id,
  data: { attributes: savedObject.attributes, references: savedObject.references },
  meta: getMeta(savedObject),
});

/** Records the same activity as the as-code routes, with tag IDs read from the references. */
const trackStoredSessionAction = (
  userActivity: CoreSetup['userActivity'],
  operation: 'create' | 'update',
  { id, attributes, references }: SavedObject<DiscoverSessionAttributes>
) => {
  const { tags } = toAsCodeTags(references);
  trackDiscoverSessionAction(userActivity, operation, {
    id,
    data: { title: attributes.title, tags },
  });
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
