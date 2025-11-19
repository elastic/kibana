/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { ContentListItem } from '../item';

/**
 * Default `transform` function for `UserContentCommonSchema`-compatible items.
 *
 * This transformation is automatically applied when no custom `transform` is provided
 * in the `dataSource` configuration, as long as your items extend `UserContentCommonSchema`.
 *
 * Input items should have this structure:
 *
 * ```ts
 * interface UserContentCommonSchema {
 *   id: string;
 *   type: string;
 *   attributes: {
 *     title: string;
 *     description?: string;
 *   };
 *   updatedAt: string;
 *   createdAt?: string;
 *   updatedBy?: string;
 *   createdBy?: string;
 *   references: SavedObjectsReference[];
 *   managed?: boolean;
 * }
 * ```
 *
 * @template T The input item type (must extend `UserContentCommonSchema`).
 * @param item - The raw item from the datasource.
 * @returns The transformed `ContentListItem`.
 *
 * @example
 * ```ts
 * // Explicitly use defaultTransform (typically not needed)
 * const dataSource = {
 *   findItems: fetchDashboards,
 *   transform: defaultTransform,
 * };
 * ```
 */
export const defaultTransform = <T extends UserContentCommonSchema = UserContentCommonSchema>(
  item: T
): ContentListItem => {
  const {
    id,
    attributes: { description, title },
    updatedAt,
    createdAt,
    updatedBy,
    createdBy,
    references,
    managed: isManaged,
    type,
    ...rest
  } = item;

  // Extract tag IDs from references (filter by `type='tag'` and use `id` field).
  // Tag references have the format: `{ type: 'tag', id: 'actual-tag-id', name: 'tag-ref-...' }`.
  const tags = references
    .filter((reference) => reference.type === 'tag')
    .map((reference) => reference.id);

  return {
    id,
    title,
    description,
    type,
    updatedAt: updatedAt ? new Date(updatedAt) : undefined,
    createdAt: createdAt ? new Date(createdAt) : undefined,
    updatedBy,
    createdBy,
    tags,
    references, // Preserve full references for advanced tagging support.
    isManaged,
    // Managed items cannot be starred. Non-managed items default to undefined,
    // which means "use provider default" (show starred if provider supports it).
    canStar: isManaged ? false : undefined,
    ...rest,
  };
};
