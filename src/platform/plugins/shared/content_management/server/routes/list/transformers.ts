/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Reference, ListResponseItem, UserInfo } from './types';

/**
 * Transforms Elasticsearch search hits into the standardized list response format.
 *
 * Extracts and normalizes saved object data from raw Elasticsearch hits, handling:
 * - **ID extraction**: Converts raw document IDs (`{namespace?:}{type}:{id}`) to saved object IDs.
 * - **Attribute extraction**: Reads type-specific attributes from `source[type]` (Kibana's SO structure).
 * - **Reference filtering**: Filters references to only include `tag` type references.
 * - **Field normalization**: Maps snake_case ES fields to camelCase response fields.
 *
 * The response always includes baseline fields required by the `ContentListItem` interface:
 * `id`, `type`, `updatedAt`, `createdAt`, `updatedBy`, `createdBy`, `managed`,
 * `attributes.title`, `attributes.description`, and `references`.
 *
 * @param hits - Array of Elasticsearch search hits from a saved objects search.
 * @param additionalAttributes - Optional array of extra attribute field names to include
 *   beyond the baseline `title` and `description` fields.
 * @returns Array of transformed list response items.
 *
 * @example
 * const items = transformHits(result.hits.hits, ['version', 'kibanaSavedObjectMeta']);
 */
export const transformHits = (
  hits: estypes.SearchHit<Record<string, unknown>>[],
  additionalAttributes?: string[]
): ListResponseItem[] => {
  return hits.map((hit) => {
    const source = hit._source as Record<string, unknown>;
    const docType = source.type as string;
    // Attributes are stored directly at source[type], not source[type].attributes.
    const attrs = (source[docType] as Record<string, unknown>) ?? {};
    const rawId = hit._id ?? '';

    // Filter references to only include tags.
    const allReferences = (source.references as Reference[]) ?? [];
    const tagReferences = allReferences.filter((ref) => ref.type === 'tag');

    // Convert raw document `_id` to the saved object `id`.
    // Raw IDs are either `{type}:{id}` (multi-namespace and default-space single-namespace types)
    // or `{namespace}:{type}:{id}` for non-default-space single-namespace types.
    const sourceNamespace = source.namespace as string | undefined;
    const namespacedPrefix = sourceNamespace ? `${sourceNamespace}:${docType}:` : undefined;
    const prefix = `${docType}:`;
    const id = (() => {
      if (namespacedPrefix && rawId.startsWith(namespacedPrefix)) {
        return rawId.slice(namespacedPrefix.length);
      }

      if (rawId.startsWith(prefix)) {
        return rawId.slice(prefix.length);
      }

      return rawId;
    })();

    // Build response with all baseline fields.
    const result: ListResponseItem = {
      id,
      type: docType,
      updatedAt: source.updated_at as string | undefined,
      updatedBy: source.updated_by as string | undefined,
      createdAt: source.created_at as string | undefined,
      createdBy: source.created_by as string | undefined,
      managed: source.managed as boolean | undefined,
      references: tagReferences,
      attributes: {
        title: attrs.title as string | undefined,
        description: attrs.description as string | undefined,
      },
    };

    // Add any additional attributes requested.
    if (additionalAttributes && additionalAttributes.length > 0) {
      for (const attrName of additionalAttributes) {
        // Skip baseline attributes that are already included.
        if (attrName === 'title' || attrName === 'description') {
          continue;
        }
        const value = attrs[attrName];
        if (value !== undefined) {
          result.attributes[attrName] = value;
        }
      }
    }

    return result;
  });
};

/**
 * Converts a user info map to a plain object for JSON serialization.
 *
 * @param userInfoMap - Map of user profile UIDs to user info objects.
 * @returns Plain object mapping UIDs to user info, or undefined if the map is empty.
 *
 * @example
 * const userInfoMap = new Map([
 *   ['u_abc123', { username: 'john.doe', email: 'john@example.com' }],
 * ]);
 * const users = userInfoMapToRecord(userInfoMap);
 * // { 'u_abc123': { username: 'john.doe', email: 'john@example.com' } }
 */
export const userInfoMapToRecord = (
  userInfoMap: Map<string, UserInfo>
): Record<string, UserInfo> | undefined => {
  if (userInfoMap.size === 0) {
    return undefined;
  }
  return Object.fromEntries(userInfoMap);
};
