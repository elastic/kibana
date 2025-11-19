/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { FindItemsFn, FindItemsParams, FindItemsResult } from '@kbn/content-list-provider';

/**
 * Configuration for additional attributes to request from the search API.
 */
export interface SearchFieldsConfig {
  /**
   * Additional saved object attributes to include beyond the baseline fields.
   * Use this for custom attributes like `status`, `version`, etc.
   */
  additionalAttributes?: string[];
}

/**
 * Options for creating a search items strategy.
 */
export interface CreateSearchItemsStrategyOptions {
  /** The Saved Object type(s) to search for (e.g., 'map', 'dashboard'). */
  savedObjectType: string | string[];
  /** HTTP client for making API requests. */
  http: HttpStart;
  /**
   * Configuration for additional attributes to request.
   * Only needed if you want custom attributes beyond the baseline fields.
   */
  searchFieldsConfig?: SearchFieldsConfig;
}

/**
 * Result of creating a search items strategy.
 */
export interface CreateSearchItemsStrategyResult {
  /** The find items function. */
  findItems: FindItemsFn<UserContentCommonSchema>;
}

/**
 * User profile information included in response when `includeCreatorInfo` is true.
 */
export interface UserInfo {
  username: string;
  email?: string;
  fullName?: string;
  avatar?: {
    initials?: string;
    color?: string;
    imageUrl?: string;
  };
}

/**
 * Response item structure from the list endpoint.
 * Always includes baseline fields; attributes can contain additional fields.
 */
interface ListResponseItem {
  id: string;
  type: string;
  updatedAt?: string;
  updatedBy?: string;
  createdAt?: string;
  createdBy?: string;
  managed?: boolean;
  references: Array<{ type: string; id: string; name: string }>; // Always included, filtered to tags.
  attributes: Record<string, unknown>;
}

/**
 * Maps raw filter inputs to their resolved canonical values.
 * Used by clients to build bidirectional mappings for deduplication.
 */
interface ResolvedFilters {
  /** Maps raw createdBy inputs to resolved user profile UIDs. */
  createdBy?: Record<string, string>;
}

/**
 * Response structure from the list endpoint.
 */
interface ListResponse {
  items: ListResponseItem[];
  total: number;
  /** User profile information keyed by UID. */
  users?: Record<string, UserInfo>;
  /** Maps raw filter inputs to their resolved canonical values. */
  resolvedFilters?: ResolvedFilters;
}

/**
 * Extended schema that includes user profile data for creators/updaters.
 */
export type UserContentWithCreatorInfo = UserContentCommonSchema & {
  createdByUser?: UserInfo;
  updatedByUser?: UserInfo;
};

/**
 * Transforms a list response item into a `UserContentCommonSchema` compatible object.
 * Custom attribute fields are preserved in the attributes object.
 * User info is looked up from the users record and included in the result.
 *
 * @param item - The raw list response item.
 * @param users - Optional record mapping UIDs to user profile information.
 */
const toUserContentSchema = (
  item: ListResponseItem,
  users?: Record<string, UserInfo>
): UserContentWithCreatorInfo => {
  const { title, description, ...customAttributes } = item.attributes;

  // Look up user info from the users record using the UID.
  const createdByUser = item.createdBy && users ? users[item.createdBy] : undefined;
  const updatedByUser = item.updatedBy && users ? users[item.updatedBy] : undefined;

  return {
    id: item.id,
    type: item.type,
    updatedAt: item.updatedAt ?? new Date().toISOString(),
    updatedBy: item.updatedBy,
    createdAt: item.createdAt,
    createdBy: item.createdBy,
    createdByUser,
    updatedByUser,
    managed: item.managed,
    references: item.references,
    attributes: {
      title: (title as string) ?? '',
      description: description as string | undefined,
      // Spread custom attributes so they're available for custom columns.
      ...customAttributes,
    },
  };
};

/**
 * Creates a search items strategy using the content_management list API.
 *
 * This strategy uses the `/internal/content_management/list` HTTP endpoint,
 * which provides advanced capabilities via `savedObjectsClient.search`:
 * - Full ES query DSL support.
 * - Runtime mappings for sorting text fields (like title) without `.keyword` mapping.
 * - Sort direction control.
 * - Multi-type search support.
 * - Starred item filtering (server-side).
 * - Dynamic runtime mappings for custom attribute sort fields.
 *
 * The response always includes baseline fields for ContentListItem:
 * - id, type.
 * - updatedAt, createdAt, updatedBy, createdBy, managed.
 * - attributes.title, attributes.description.
 * - references (filtered to tags only).
 *
 * Use this strategy for content types without `.keyword` mappings on text fields,
 * or when advanced search capabilities are needed.
 *
 * @param options - Configuration options for the strategy.
 * @returns An object containing the `findItems` function.
 *
 * @example
 * ```tsx
 * import { createSearchItemsStrategy } from '@kbn/content-list-provider-server';
 *
 * // Basic usage - includes all baseline fields.
 * const { findItems } = createSearchItemsStrategy({
 *   savedObjectType: 'map',
 *   http: coreStart.http,
 * });
 *
 * // With custom attributes for display/sorting.
 * const { findItems } = createSearchItemsStrategy({
 *   savedObjectType: 'dashboard',
 *   http: coreStart.http,
 *   searchFieldsConfig: {
 *     additionalAttributes: ['status', 'version'],
 *   },
 * });
 * ```
 */
export const createSearchItemsStrategy = ({
  savedObjectType,
  http,
  searchFieldsConfig,
}: CreateSearchItemsStrategyOptions): CreateSearchItemsStrategyResult => {
  const findItems: FindItemsFn<UserContentCommonSchema> = async ({
    searchQuery,
    filters,
    sort,
    page,
    signal,
  }: FindItemsParams): Promise<FindItemsResult<UserContentCommonSchema>> => {
    try {
      const response = await http.post<ListResponse>('/internal/content_management/list', {
        version: '1',
        body: JSON.stringify({
          type: savedObjectType,
          searchQuery: searchQuery || undefined,
          tags:
            filters.tags?.include?.length || filters.tags?.exclude?.length
              ? {
                  include: filters.tags?.include,
                  exclude: filters.tags?.exclude,
                }
              : undefined,
          favoritesOnly: filters.starredOnly ?? undefined,
          // Filter by creator user IDs.
          createdBy: filters.users?.length ? filters.users : undefined,
          sort: {
            field: sort.field ?? 'updatedAt',
            direction: sort.direction ?? 'desc',
          },
          page: {
            index: page.index,
            size: page.size,
          },
          // Additional attributes beyond the baseline fields.
          additionalAttributes: searchFieldsConfig?.additionalAttributes,
        }),
        signal,
      });

      const items = response.items.map((item) => toUserContentSchema(item, response.users));

      return {
        items,
        total: response.total,
        resolvedFilters: response.resolvedFilters,
      };
    } catch (e) {
      // Don't log abort errors - they're expected during navigation.
      if (e instanceof Error && e.name === 'AbortError') {
        return { items: [], total: 0 };
      }
      // eslint-disable-next-line no-console
      console.error('Error searching saved objects:', e);
      return {
        items: [],
        total: 0,
      };
    }
  };

  return { findItems };
};
