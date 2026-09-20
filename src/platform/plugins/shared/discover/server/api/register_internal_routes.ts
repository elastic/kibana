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
import type { CoreSetup, Logger, RequestHandlerContext, SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { VersionedRouter } from '@kbn/core-http-server';
import { AuthzDisabled } from '@kbn/core-security-server';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import {
  DISCOVER_SESSION_API_VERSION,
  DISCOVER_SESSION_INTERNAL_API_BASE_PATH,
} from '../../common/constants';
import {
  discoverSessionInternalDataSchema,
  discoverSessionInternalParamsSchema,
  discoverSessionInternalResponseSchema,
  type DiscoverSessionInternalResponse,
} from './internal_schema';
import {
  createStoredDiscoverSession,
  resolveStoredDiscoverSession,
  upsertStoredDiscoverSession,
} from './stored_session';
import { trackDiscoverSessionAction } from './user_activity';

/** Registers the stored-format HTTP endpoints used to load and save Discover sessions in the UI. */
export const registerInternalRoutes = (
  router: VersionedRouter<RequestHandlerContext>,
  userActivity: CoreSetup['userActivity'],
  logger: Logger
): void => {
  const routeConfig = {
    access: 'internal',
    enableQueryVersion: true,
    security: { authz: AuthzDisabled.delegateToSOClient },
  } as const;

  router
    .post({
      path: DISCOVER_SESSION_INTERNAL_API_BASE_PATH,
      summary: 'Create a Discover session from its stored state',
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
          const savedObject = await createStoredDiscoverSession(context, request.body);
          trackStoredSessionAction(userActivity, 'create', savedObject);
          return response.created({ body: toInternalResponse(savedObject) });
        } catch (error) {
          return writeErrorHandler(error, response, logger, request);
        }
      }
    );

  router
    .put({
      path: `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/{id}`,
      summary: 'Create or replace a Discover session from its stored state',
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
            409: { description: 'Conflict' },
          },
        },
      },
      async (context, request, response) => {
        try {
          const { savedObject, operation } = await upsertStoredDiscoverSession(
            context,
            request.params.id,
            request.body
          );
          trackStoredSessionAction(userActivity, operation, savedObject);
          const body = toInternalResponse(savedObject);
          return operation === 'create' ? response.created({ body }) : response.ok({ body });
        } catch (error) {
          return writeErrorHandler(error, response, logger, request);
        }
      }
    );

  router
    .get({
      path: `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/{id}`,
      summary: 'Get the stored state of a Discover session',
      ...routeConfig,
    })
    .addVersion(
      {
        version: DISCOVER_SESSION_API_VERSION,
        validate: {
          request: { params: discoverSessionInternalParamsSchema },
          response: {
            200: { body: () => discoverSessionInternalResponseSchema, description: 'Success' },
            403: { description: 'Forbidden' },
            404: { description: 'Not found' },
            500: { description: 'Internal server error' },
          },
        },
      },
      async (context, request, response) => {
        try {
          const { savedObject, resolveHeaders } = await resolveStoredDiscoverSession(
            context,
            request.params.id
          );
          return response.ok({ body: toInternalResponse(savedObject), headers: resolveHeaders });
        } catch (error) {
          if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
            const message = `A Discover session with ID [${request.params.id}] was not found.`;
            logRequest(logger, request, 'debug', message);
            return response.notFound({ body: { message } });
          }
          return writeErrorHandler(error, response, logger, request);
        }
      }
    );
};

const toInternalResponse = (
  savedObject: SavedObject<DiscoverSessionAttributes>
): DiscoverSessionInternalResponse => ({
  id: savedObject.id,
  data: { attributes: savedObject.attributes, references: savedObject.references },
  meta: getMeta(savedObject),
});

const trackStoredSessionAction = (
  userActivity: CoreSetup['userActivity'],
  operation: 'create' | 'update',
  savedObject: SavedObject<DiscoverSessionAttributes>
): void => {
  const { tags } = toAsCodeTags(savedObject.references);
  trackDiscoverSessionAction(userActivity, operation, {
    id: savedObject.id,
    data: { title: savedObject.attributes.title, tags },
  });
};
