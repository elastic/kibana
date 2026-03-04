/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, Logger, CoreSetup } from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import {
  getFavoritesForTypes,
  favoritesSavedObjectName,
} from '@kbn/content-management-favorites-server';

import type { ListResponse, ResolvedFilters } from './types';
import {
  fieldNameSchema,
  buildRuntimeMappings,
  buildSort,
  buildSearchQuery,
} from './query_builder';
import { transformHits, userInfoMapToRecord } from './transformers';
import {
  isUserProfileUid,
  getDistinctCreators,
  resolveCreatedByFilter,
  fetchUserProfiles,
} from './user_resolution';

/**
 * Response validation schema for OpenAPI documentation.
 * Lazily evaluated to avoid expensive schema instantiation on startup.
 */
const responseValidation = () => {
  const referenceSchema = schema.object({
    type: schema.string(),
    id: schema.string(),
    name: schema.string(),
  });

  const userInfoSchema = schema.object({
    username: schema.string(),
    email: schema.maybe(schema.string()),
    fullName: schema.maybe(schema.string()),
    avatar: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  });

  const listResponseItemSchema = schema.object({
    id: schema.string(),
    type: schema.string(),
    updatedAt: schema.maybe(schema.string()),
    updatedBy: schema.maybe(schema.string()),
    createdAt: schema.maybe(schema.string()),
    createdBy: schema.maybe(schema.string()),
    managed: schema.maybe(schema.boolean()),
    references: schema.arrayOf(referenceSchema, { maxSize: 1000 }),
    attributes: schema.object(
      {
        title: schema.maybe(schema.string()),
        description: schema.maybe(schema.string()),
      },
      { unknowns: 'allow' }
    ),
  });

  return schema.object({
    items: schema.arrayOf(listResponseItemSchema, { maxSize: 10000 }),
    total: schema.number(),
    users: schema.maybe(schema.recordOf(schema.string(), userInfoSchema)),
    resolvedFilters: schema.maybe(
      schema.object({
        createdBy: schema.maybe(schema.recordOf(schema.string(), schema.string())),
      })
    ),
  });
};

/**
 * Configuration parameters for registering the content management list route.
 *
 * @see {@link registerListRoute}
 */
interface RegisterListRouteParams {
  coreSetup: CoreSetup;
  router: IRouter;
  logger: Logger;
}

/**
 * Registers the `POST /internal/content_management/list` versioned API route.
 *
 * This route provides advanced listing capabilities for saved objects, supporting:
 *
 * - **Text search**: Full-text search across title and description fields
 * - **Tag filtering**: Include or exclude objects by tag references
 * - **Favorites filtering**: Filter to only user's favorited objects
 * - **Creator filtering**: Filter by creator user ID, username, or email
 * - **Flexible sorting**: Sort by title, timestamps, or custom attributes
 * - **Pagination**: Standard offset-based pagination
 * - **User enrichment**: Includes creator/updater profile information
 *
 * The route delegates authorization to the Saved Objects Client, meaning users
 * only see objects they have permission to access.
 *
 * @param params - Configuration object containing:
 *   - `coreSetup`: Kibana CoreSetup for accessing start services
 *   - `router`: IRouter instance to register the route on
 *   - `logger`: Logger instance for error and debug logging
 *
 * @example
 * // In plugin setup:
 * registerListRoute({
 *   coreSetup: core,
 *   router: core.http.createRouter(),
 *   logger: this.logger,
 * });
 *
 * @example
 * // Client request:
 * POST /internal/content_management/list
 * {
 *   "type": "dashboard",
 *   "searchQuery": "sales",
 *   "tags": { "include": ["tag-123"] },
 *   "sort": { "field": "updatedAt", "direction": "desc" },
 *   "page": { "index": 0, "size": 25 }
 * }
 */
export const registerListRoute = ({ coreSetup, router, logger }: RegisterListRouteParams): void => {
  router.versioned
    .post({
      path: '/internal/content_management/list',
      access: 'internal',
      summary: 'List saved objects with advanced sorting and filtering',
      description:
        'Provides advanced listing capabilities for saved objects including text search, ' +
        'tag filtering, favorites filtering, creator filtering, sorting by various fields, ' +
        'and pagination. User profile information is enriched for creator and updater fields.',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the Saved Objects Client',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              type: schema.oneOf([
                schema.string({ minLength: 1, maxLength: 100 }),
                schema.arrayOf(schema.string({ minLength: 1, maxLength: 100 }), { maxSize: 100 }),
              ]),
              searchQuery: schema.maybe(schema.string({ maxLength: 1000 })),
              tags: schema.maybe(
                schema.object({
                  include: schema.maybe(
                    schema.arrayOf(schema.string({ minLength: 1 }), { maxSize: 100 })
                  ),
                  exclude: schema.maybe(
                    schema.arrayOf(schema.string({ minLength: 1 }), { maxSize: 100 })
                  ),
                })
              ),
              favoritesOnly: schema.maybe(schema.boolean()),
              // Filter by creator user IDs (uids), usernames, or emails.
              createdBy: schema.maybe(
                schema.arrayOf(schema.string({ minLength: 1 }), { maxSize: 100 })
              ),
              sort: schema.object({
                field: fieldNameSchema,
                direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
              }),
              page: schema.object({
                index: schema.number({ min: 0 }),
                size: schema.number({ min: 1, max: 10000 }),
              }),
              // Additional saved object attributes to include beyond baseline fields.
              additionalAttributes: schema.maybe(schema.arrayOf(fieldNameSchema, { maxSize: 50 })),
            }),
          },
          response: {
            200: {
              body: responseValidation,
            },
          },
        },
      },
      router.handleLegacyErrors(async (context, request, response) => {
        try {
          const [coreStart] = await coreSetup.getStartServices();
          const coreContext = await context.core;
          const {
            type,
            searchQuery,
            tags,
            favoritesOnly,
            createdBy,
            sort,
            page,
            additionalAttributes,
          } = request.body;

          // Get user identity for favorites.
          const userId = coreContext.security.authc.getCurrentUser()?.profile_uid;

          if (favoritesOnly && !userId) {
            return response.forbidden({
              body: { message: 'User identity required for favorites filtering' },
            });
          }

          // Get the saved objects client.
          const savedObjectsClient = coreContext.savedObjects.client;
          const { typeRegistry } = coreContext.savedObjects;
          const namespaces = [savedObjectsClient.getCurrentNamespace() ?? DEFAULT_NAMESPACE_STRING];

          /**
           * Fetches favorite IDs and converts them to raw document IDs for ES filtering.
           *
           * Favorites are stored in a hidden single-namespace saved object type, keyed by `{type}:{userId}`.
           * To filter content documents via `savedObjectsClient.search`, we convert favorite IDs into
           * raw document IDs (`{namespace?:}{type}:{id}`), respecting the current space for single-namespace types.
           */
          const getFavoriteRawDocumentIds = async (): Promise<string[] | undefined> => {
            if (!favoritesOnly || !userId) {
              return undefined;
            }

            const favoritesSoClient = coreContext.savedObjects.getClient({
              includedHiddenTypes: [favoritesSavedObjectName],
              excludedExtensions: [SECURITY_EXTENSION_ID],
            });

            const types = Array.isArray(type) ? type : [type];
            const namespace = savedObjectsClient.getCurrentNamespace();

            // Fetch favorites for all requested types.
            const favoritesByType = await getFavoritesForTypes(types, userId, {
              savedObjectClient: favoritesSoClient,
              logger,
            });

            // Convert favorite IDs to raw document IDs for ES filtering.
            // Raw IDs include the namespace prefix for single-namespace types.
            const rawIds: string[] = [];
            for (const [t, favoriteIds] of favoritesByType) {
              const rawIdPrefix =
                namespace && typeRegistry.isSingleNamespace(t) ? `${namespace}:` : '';

              for (const favoriteId of favoriteIds) {
                rawIds.push(`${rawIdPrefix}${t}:${favoriteId}`);
              }
            }

            return rawIds;
          };

          const favoriteRawIds = await getFavoriteRawDocumentIds();

          // If favoritesOnly was requested but there are no favorites, return early with an empty result.
          if (favoritesOnly && (!favoriteRawIds || favoriteRawIds.length === 0)) {
            const listResponse: ListResponse = { items: [], total: 0 };
            return response.ok({ body: listResponse });
          }

          // Resolve createdBy filter values (usernames/emails) to UIDs.
          // If createdBy contains non-UID values, we need to fetch distinct creators first.
          let resolvedCreatedBy: string[] | undefined;
          let createdByInputToUidMap: Record<string, string> | undefined;
          // Track if user explicitly requested createdBy filter (for returning empty results).
          const hasCreatedByFilter = createdBy && createdBy.length > 0;

          if (hasCreatedByFilter) {
            const hasNonUidValues = createdBy.some((v) => !isUserProfileUid(v));

            if (hasNonUidValues) {
              // Fetch distinct creators from the index to resolve usernames/emails.
              const distinctCreators = await getDistinctCreators(
                savedObjectsClient,
                type,
                namespaces,
                logger
              );
              const resolveResult = await resolveCreatedByFilter(
                createdBy,
                distinctCreators,
                coreStart,
                logger
              );
              resolvedCreatedBy = resolveResult.uids;
              createdByInputToUidMap = resolveResult.inputToUidMap;

              // If user requested createdBy filter but no UIDs resolved, use a placeholder
              // that will never match to ensure zero results are returned.
              if (resolvedCreatedBy.length === 0) {
                resolvedCreatedBy = ['__no_match__'];
              }
            } else {
              // All values are UIDs, no resolution needed.
              resolvedCreatedBy = createdBy;
              // Build identity mapping for UIDs.
              createdByInputToUidMap = {};
              for (const uid of createdBy) {
                createdByInputToUidMap[uid] = uid;
              }
            }
          }

          // Build the ES query.
          const query = buildSearchQuery({
            searchQuery,
            tags,
            favoritesOnly,
            favoriteRawIds,
            createdBy: resolvedCreatedBy,
            type,
          });

          // Perform the search.
          const result = await savedObjectsClient.search({
            type,
            namespaces,
            query,
            runtime_mappings: buildRuntimeMappings(sort.field),
            sort: buildSort(sort.field, sort.direction),
            from: page.index * page.size,
            size: page.size,
            track_total_hits: true,
          });

          // Transform the response.
          const transformedItems = transformHits(result.hits.hits, additionalAttributes);
          const total =
            typeof result.hits.total === 'number'
              ? result.hits.total
              : result.hits.total?.value ?? 0;

          // Collect unique user IDs for profile enrichment.
          const userIds = new Set<string>();
          for (const item of transformedItems) {
            if (item.createdBy) userIds.add(item.createdBy);
            if (item.updatedBy) userIds.add(item.updatedBy);
          }

          // Fetch user profiles.
          const userInfoMap = await fetchUserProfiles(Array.from(userIds), coreStart, logger);
          const users = userInfoMapToRecord(userInfoMap);

          // Build resolved filters for client deduplication.
          const resolvedFilters: ResolvedFilters | undefined =
            createdByInputToUidMap && Object.keys(createdByInputToUidMap).length > 0
              ? { createdBy: createdByInputToUidMap }
              : undefined;

          const listResponse: ListResponse = {
            items: transformedItems,
            total,
            users,
            resolvedFilters,
          };

          return response.ok({ body: listResponse });
        } catch (e) {
          logger.error(e);
          throw e;
        }
      })
    );
};
