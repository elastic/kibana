/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentManagementTagsServices, Tag } from '@kbn/content-management-tags';

/**
 * Minimal structural type describing the part of `SavedObjectsTaggingApiUi`
 * needed to fill `services.tags`. Accepting a structural type rather than the
 * full plugin interface keeps the helper usable from any consumer that can
 * synthesize a `getTagList()` (e.g. Visualize's flattened tagging API).
 */
export interface TagsApi {
  /** Synchronously return the list of available tags. */
  getTagList: () => Tag[];
}

/**
 * Build a {@link ContentManagementTagsServices} suitable for
 * `ContentListClientProvider`'s `services.tags` slot from a tagging API.
 *
 * Pass `taggingApi.ui` from `SavedObjectsTaggingApi` (see
 * `@kbn/saved-objects-tagging-oss-plugin/public`) directly:
 *
 * ```ts
 * const tags = createTagsService(savedObjectsTagging.getTaggingApi()?.ui);
 * ```
 *
 * Returns `undefined` when no API is supplied so callers can pass the result
 * straight through without a guard:
 *
 * ```tsx
 * <ContentListClientProvider services={{ ...core, tags: createTagsService(api) }} />
 * ```
 */
export const createTagsService = (
  taggingApi: TagsApi | null | undefined
): ContentManagementTagsServices | undefined => {
  if (!taggingApi) {
    return undefined;
  }
  return { getTagList: () => taggingApi.getTagList() };
};
