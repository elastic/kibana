/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AuthzDisabled } from '@kbn/core-security-server';
import type { VersionedRouter } from '@kbn/core-http-server';
import type { CoreSetup, KibanaResponseFactory, RequestHandlerContext } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod';
import { MAX_SAVED_OBJECT_ID_LENGTH } from '@kbn/core-saved-objects-server';
import { writeErrorHandler } from '@kbn/as-code-utils';
import type { Logger } from '@kbn/logging';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import {
  DISCOVER_SESSION_CHANGE_HISTORY_API_VERSION,
  DISCOVER_SESSION_CHANGE_HISTORY_OBJECT_TYPE,
  DISCOVER_SESSION_INTERNAL_API_BASE_PATH,
} from '../../common/constants';
import { discoverSessionInternalDataSchema } from '../api/internal_schema';
import { transformInternalDiscoverSessionIn } from '../api/transforms/transform_discover_session_in';
import { updateStoredDiscoverSession } from '../api/stored_session';
import { getChangeHistoryClient } from './change_history_service';
import { getLatestHistorySequence, getSessionSpaceId } from './utils';

const MAX_PER_PAGE = 100;
// Elasticsearch's default `index.max_result_window`: `from + size` may not exceed it
const MAX_RESULT_WINDOW = 10000;

const routeConfig = {
  access: 'internal',
  // history is read with an internally privileged client, so access to the session saved object is verified instead
  security: { authz: AuthzDisabled.delegateToSOClient },
} as const;

const paramsSchema = lazySchema(() =>
  z.object({ id: z.string().min(1).max(MAX_SAVED_OBJECT_ID_LENGTH) }).strict()
);
const changeParamsSchema = lazySchema(() =>
  paramsSchema.extend({
    changeId: z.string().min(1).max(MAX_SAVED_OBJECT_ID_LENGTH),
  })
);

const listResponseSchema = lazySchema(() =>
  z.object({
    items: z.array(
      z.object({
        id: z.string(),
        timestamp: z.string(),
        actor: z.object({ name: z.string(), id: z.string().optional() }),
        action: z.string(),
        isCurrent: z.boolean(),
        comment: z.string().optional(),
        changes: z.object({ count: z.number() }).optional(),
        metadata: z.object({ version: z.number().optional() }),
      })
    ),
    total: z.number(),
  })
);
export type DiscoverSessionHistoryListResponse = z.infer<typeof listResponseSchema>;

const detailsResponseSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    timestamp: z.string(),
    actor: z.object({ name: z.string(), profileId: z.string().optional() }),
    action: z.string(),
    snapshot: discoverSessionInternalDataSchema,
    isCurrent: z.boolean(),
    metadata: z.object({ version: z.number().optional() }),
  })
);
export type DiscoverSessionHistoryDetailsResponse = z.infer<typeof detailsResponseSchema>;

/**
 * Verifies the request can access the session saved object, then resolves its space and the
 * latest history sequence. Returns the error response to send when the request cannot be served.
 */
const getHistoryContext = async (
  requestContext: RequestHandlerContext,
  response: KibanaResponseFactory,
  sessionId: string
) => {
  const { core } = await requestContext.resolve(['core']);
  let session;
  try {
    session = await core.savedObjects.client.get<DiscoverSessionAttributes>(
      SavedSearchType,
      sessionId
    );
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) return { error: response.notFound() };
    if (SavedObjectsErrorHelpers.isForbiddenError(error)) return { error: response.forbidden() };
    throw error;
  }

  let client;
  try {
    client = await getChangeHistoryClient();
  } catch {
    return {
      error: response.customError({
        statusCode: 503,
        body: { message: 'Change history service is not ready' },
      }),
    };
  }

  const spaceId = getSessionSpaceId(session);
  const latestSequence = await getLatestHistorySequence(spaceId, sessionId);
  return { client, spaceId, latestSequence };
};

export const registerChangeHistoryRoutes = (
  core: CoreSetup,
  router: VersionedRouter<RequestHandlerContext>,
  logger: Logger
) => {
  const historyPath = `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/{id}/history`;
  const version = DISCOVER_SESSION_CHANGE_HISTORY_API_VERSION;

  router
    .get({
      path: historyPath,
      summary: 'List the change history of a Discover session',
      ...routeConfig,
    })
    .addVersion(
      {
        version,
        validate: {
          request: {
            params: paramsSchema,
            query: z
              .object({
                page: z.coerce.number().int().min(1).optional(),
                per_page: z.coerce.number().int().min(1).max(MAX_PER_PAGE).optional(),
              })
              .strict()
              .refine(
                ({ page = 1, per_page: perPage }) =>
                  !perPage || page * perPage <= MAX_RESULT_WINDOW,
                {
                  message: `page * per_page must not exceed ${MAX_RESULT_WINDOW}`,
                  path: ['page'],
                }
              ),
          },
          response: { 200: { body: () => listResponseSchema, description: 'Success' } },
        },
      },
      async (context, request, response) => {
        try {
          const history = await getHistoryContext(context, response, request.params.id);
          if (history.error) return history.error;
          const { client, spaceId, latestSequence } = history;

          const { page = 1, per_page: perPage } = request.query;
          const { total, items } = await client.getHistory(
            spaceId,
            DISCOVER_SESSION_CHANGE_HISTORY_OBJECT_TYPE,
            request.params.id,
            {
              size: perPage,
              from: perPage ? (page - 1) * perPage : undefined, // `page` is 1-indexed; `from` is an offset
            }
          );

          const uids = new Set(items.flatMap((item) => (item.user?.id ? [item.user.id] : [])));
          const profiles =
            uids.size > 0
              ? await (await core.getStartServices())[0].userProfile.bulkGet({ uids })
              : [];
          const profileByUid = new Map(profiles.map((profile) => [profile.uid, profile]));

          return response.ok({
            body: {
              total,
              items: items.map((item) => {
                const { user } = item;
                const profile = user.id ? profileByUid.get(user.id) : undefined;
                const changeCount = item.metadata?.changeCount;
                return {
                  id: item.event.id,
                  action: item.event.action,
                  isCurrent:
                    latestSequence !== undefined && item.object.sequence === latestSequence,
                  timestamp: item['@timestamp'],
                  actor: { name: profile?.user.full_name || user.name, id: user.id },
                  ...(typeof changeCount === 'number' ? { changes: { count: changeCount } } : {}),
                  ...('restoredFrom' in (item.metadata ?? {})
                    ? {
                        comment: i18n.translate('discover.changeHistory.restoredFromComment', {
                          defaultMessage: 'Restored from v{version}',
                          values: { version: item.metadata!.restoredFrom as number },
                        }),
                      }
                    : {}),
                  metadata: { version: item.object.sequence },
                };
              }),
            },
          });
        } catch (error) {
          return writeErrorHandler(error, response, logger, request);
        }
      }
    );

  router
    .get({
      path: `${historyPath}/{changeId}`,
      summary: 'Get a change of a Discover session',
      ...routeConfig,
    })
    .addVersion(
      {
        version,
        validate: {
          request: { params: changeParamsSchema },
          response: { 200: { body: () => detailsResponseSchema, description: 'Success' } },
        },
      },
      async (context, request, response) => {
        try {
          const history = await getHistoryContext(context, response, request.params.id);
          if (history.error) return history.error;
          const { client, spaceId, latestSequence } = history;

          const { items } = await client.getHistory(
            spaceId,
            DISCOVER_SESSION_CHANGE_HISTORY_OBJECT_TYPE,
            request.params.id,
            { additionalFilters: [{ term: { 'event.id': request.params.changeId } }], size: 1 }
          );
          const [item] = items;
          if (!item) return response.notFound();

          return response.ok({
            body: {
              id: request.params.changeId,
              timestamp: item['@timestamp'],
              actor: { name: item.user.name, profileId: item.user.id },
              action: item.event.action,
              snapshot: item.object.snapshot as z.infer<typeof discoverSessionInternalDataSchema>,
              isCurrent: latestSequence !== undefined && item.object.sequence === latestSequence,
              metadata: { version: item.object.sequence },
            },
          });
        } catch (error) {
          return writeErrorHandler(error, response, logger, request);
        }
      }
    );

  router
    .post({
      path: `${historyPath}/{changeId}/_restore`,
      summary: 'Restore a Discover session to a previous change',
      ...routeConfig,
    })
    .addVersion(
      {
        version,
        validate: {
          request: { params: changeParamsSchema },
          response: { 204: { description: 'Restored' } },
        },
      },
      async (context, request, response) => {
        try {
          const history = await getHistoryContext(context, response, request.params.id);
          if (history.error) return history.error;
          const { client, spaceId } = history;

          const { items } = await client.getHistory(
            spaceId,
            DISCOVER_SESSION_CHANGE_HISTORY_OBJECT_TYPE,
            request.params.id,
            { additionalFilters: [{ term: { 'event.id': request.params.changeId } }], size: 1 }
          );
          const [item] = items;
          if (!item) return response.notFound();

          // a restore is a regular update with the restored snapshot, so it records a new version
          const storedSession = transformInternalDiscoverSessionIn(
            discoverSessionInternalDataSchema.parse(item.object.snapshot)
          );
          await updateStoredDiscoverSession(context, request.params.id, storedSession, {
            restoredFrom: item.object.sequence,
          });

          return response.noContent();
        } catch (error) {
          return writeErrorHandler(error, response, logger, request);
        }
      }
    );
};
