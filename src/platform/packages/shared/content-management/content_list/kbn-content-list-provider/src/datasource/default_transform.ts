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
 * @template T The input item type (must extend `UserContentCommonSchema`).
 * @param item - The raw item from the datasource.
 * @returns The transformed `ContentListItem`.
 */
export const defaultTransform = <T extends UserContentCommonSchema = UserContentCommonSchema>(
  item: T
): ContentListItem => {
  const {
    id,
    type,
    attributes: { title, description },
    updatedAt,
  } = item;

  return {
    id,
    title,
    description,
    type,
    updatedAt: updatedAt ? new Date(updatedAt) : undefined,
  };
};
