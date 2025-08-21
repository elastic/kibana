/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsReference } from '@kbn/content-management-content-editor';

export interface UserContentCommonSchema {
  id: string;
  updatedAt: string;
  updatedBy?: string;
  createdAt?: string;
  createdBy?: string;
  managed?: boolean;
  references: SavedObjectsReference[];
  type: string;
  attributes: {
    title: string;
    description?: string;
  };
}

// Export recently accessed items components
export { RecentlyAccessedItemsPanel } from './components/recently_accessed_items_panel';
export { useRecentlyAccessedItems } from './hooks/use_recently_accessed_items';
export type { RecentlyAccessedItem, RecentlyAccessedFilter } from './hooks/use_recently_accessed_items';

// Export tagged items components
export { TaggedItemsPanel } from './components/tagged_items_panel';
export { useTaggedItems } from './hooks/use_tagged_items';
export type { TaggedItem, UseTaggedItemsOptions, UseTaggedItemsResult } from './hooks/use_tagged_items';
