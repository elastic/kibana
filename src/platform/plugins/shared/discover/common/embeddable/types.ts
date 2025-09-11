/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public';
import type { SerializedTimeRange, SerializedTitles } from '@kbn/presentation-publishing';
import type { SavedSearch, SavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import type { EDITABLE_SAVED_SEARCH_KEYS } from './constants';

// These are options that are not persisted in the saved object, but can be used by solutions
// when utilising the SavedSearchComponent package outside of dashboard contexts.
export interface NonPersistedDisplayOptions {
  solutionNavIdOverride?: 'oblt' | 'security' | 'search';
  enableDocumentViewer?: boolean;
  enableFilters?: boolean;
}

export type EditableSavedSearchAttributes = Partial<
  Pick<SavedSearchAttributes, (typeof EDITABLE_SAVED_SEARCH_KEYS)[number]>
>;

export type SearchEmbeddableSerializedState = SerializedTitles &
  SerializedTimeRange &
  Partial<DynamicActionsSerializedState> &
  EditableSavedSearchAttributes & {
    // by value
    attributes?: SavedSearchAttributes & { references: SavedSearch['references'] };
    // by reference
    savedObjectId?: string;
    nonPersistedDisplayOptions?: NonPersistedDisplayOptions;
  };
