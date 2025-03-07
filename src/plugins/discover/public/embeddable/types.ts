/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { HasInspectorAdapters } from '@kbn/inspector-plugin/public';
import type {
  EmbeddableApiContext,
  HasEditCapabilities,
  HasInPlaceLibraryTransforms,
  HasSupportedTriggers,
  PublishesBlockingError,
  PublishesDataLoading,
  PublishesDataViews,
  PublishesSavedObjectId,
  PublishesUnifiedSearch,
  PublishesWritablePanelTitle,
  PublishingSubject,
  SerializedTimeRange,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import type {
  SavedSearch,
  SavedSearchAttributes,
  SerializableSavedSearch,
} from '@kbn/saved-search-plugin/common/types';
import type { DataTableColumnsMeta } from '@kbn/unified-data-table';
import type { BehaviorSubject } from 'rxjs';
import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public/plugin';
import type { HasDynamicActions } from '@kbn/embeddable-enhanced-plugin/public';
import type { EDITABLE_SAVED_SEARCH_KEYS } from './constants';

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

export type SearchEmbeddableSerializedState = SerializedTitles &
  SerializedTimeRange &
  Partial<DynamicActionsSerializedState> &
  Partial<Pick<SavedSearchAttributes, (typeof EDITABLE_SAVED_SEARCH_KEYS)[number]>> & {
    // by value
    attributes?: SavedSearchAttributes & { references: SavedSearch['references'] };
    // by reference
    savedObjectId?: string;
  };

export type SearchEmbeddableRuntimeState = SearchEmbeddableSerializedAttributes &
  SerializedTitles &
  SerializedTimeRange &
  Partial<DynamicActionsSerializedState> & {
    savedObjectTitle?: string;
    savedObjectId?: string;
    savedObjectDescription?: string;
  };

export type SearchEmbeddableApi = DefaultEmbeddableApi<
  SearchEmbeddableSerializedState,
  SearchEmbeddableRuntimeState
> &
  PublishesDataViews &
  PublishesSavedObjectId &
  PublishesDataLoading &
  PublishesBlockingError &
  PublishesWritablePanelTitle &
  PublishesSavedSearch &
  PublishesDataViews &
  PublishesUnifiedSearch &
  HasInPlaceLibraryTransforms &
  HasTimeRange &
  HasInspectorAdapters &
  Partial<HasEditCapabilities & PublishesSavedObjectId> &
  HasDynamicActions &
  HasSupportedTriggers;

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
