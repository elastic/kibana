/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataTableRecord } from '@kbn/discover-utils/types';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { HasInspectorAdapters } from '@kbn/inspector-plugin/public';
import {
  EmbeddableApiContext,
  HasEditCapabilities,
  HasInPlaceLibraryTransforms,
  PublishesBlockingError,
  PublishesDataLoading,
  PublishesSavedObjectId,
  PublishesWritablePanelTitle,
  PublishesWritableUnifiedSearch,
  PublishingSubject,
  SerializedTimeRange,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import {
  SavedSearch,
  SavedSearchAttributes,
  SerializableSavedSearch,
} from '@kbn/saved-search-plugin/common/types';
import { DataTableColumnsMeta } from '@kbn/unified-data-table';
import { BehaviorSubject } from 'rxjs';
import { PublishesWritableDataViews } from '@kbn/presentation-publishing/interfaces/publishes_data_views';
import { EDITABLE_SAVED_SEARCH_KEYS } from './constants';

export type SearchEmbeddableState = Pick<
  SerializableSavedSearch,
  | 'rowHeight'
  | 'rowsPerPage'
  | 'headerRowHeight'
  | 'columns'
  | 'sort'
  | 'sampleSize'
  | 'viewMode'
  | 'grid'
  | 'density'
> & {
  rows: DataTableRecord[];
  columnsMeta: DataTableColumnsMeta | undefined;
  totalHitCount: number | undefined;
  inspectorAdapters: Record<string, unknown>;
};

export type SearchEmbeddableStateManager = {
  [key in keyof Required<SearchEmbeddableState>]: BehaviorSubject<SearchEmbeddableState[key]>;
};

export type SearchEmbeddableSerializedAttributes = Omit<
  SearchEmbeddableState,
  'rows' | 'columnsMeta' | 'totalHitCount' | 'searchSource' | 'inspectorAdapters'
> &
  Pick<SerializableSavedSearch, 'serializedSearchSource'>;

// These are options that are not persisted in the saved object, but can be used by solutions
// when utilising the SavedSearchComponent package outside of dashboard contexts.
export interface NonPersistedDisplayOptions {
  enableDocumentViewer?: boolean;
  enableFilters?: boolean;
}

export type SearchEmbeddableSerializedState = SerializedTitles &
  SerializedTimeRange &
  Partial<Pick<SavedSearchAttributes, (typeof EDITABLE_SAVED_SEARCH_KEYS)[number]>> & {
    // by value
    attributes?: SavedSearchAttributes & { references: SavedSearch['references'] };
    // by reference
    savedObjectId?: string;
    nonPersistedDisplayOptions?: NonPersistedDisplayOptions;
  };

export type SearchEmbeddableRuntimeState = SearchEmbeddableSerializedAttributes &
  SerializedTitles &
  SerializedTimeRange & {
    savedObjectTitle?: string;
    savedObjectId?: string;
    savedObjectDescription?: string;
    nonPersistedDisplayOptions?: NonPersistedDisplayOptions;
  };

export type SearchEmbeddableApi = DefaultEmbeddableApi<
  SearchEmbeddableSerializedState,
  SearchEmbeddableRuntimeState
> &
  PublishesSavedObjectId &
  PublishesDataLoading &
  PublishesBlockingError &
  PublishesWritablePanelTitle &
  PublishesSavedSearch &
  PublishesWritableDataViews &
  PublishesWritableUnifiedSearch &
  HasInPlaceLibraryTransforms &
  HasTimeRange &
  HasInspectorAdapters &
  Partial<HasEditCapabilities & PublishesSavedObjectId>;

export interface PublishesSavedSearch {
  savedSearch$: PublishingSubject<SavedSearch>;
}

export const apiPublishesSavedSearch = (
  api: EmbeddableApiContext['embeddable']
): api is PublishesSavedSearch => {
  const embeddable = api as PublishesSavedSearch;
  return Boolean(embeddable.savedSearch$);
};

export interface HasTimeRange {
  hasTimeRange(): boolean;
}
