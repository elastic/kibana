/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataTableRecord } from '@kbn/discover-utils/types';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import {
  EmbeddableApiContext,
  HasEditCapabilities,
  HasInPlaceLibraryTransforms,
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
import {
  SavedSearch,
  SavedSearchAttributes,
  SerializableSavedSearch,
} from '@kbn/saved-search-plugin/common/types';
import { DataTableColumnsMeta } from '@kbn/unified-data-table';
import { BehaviorSubject } from 'rxjs';
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
> & {
  rows: DataTableRecord[];
  columnsMeta: DataTableColumnsMeta | undefined;
  totalHitCount: number | undefined;
};

export type SearchEmbeddableStateManager = {
  [key in keyof Required<SearchEmbeddableState>]: BehaviorSubject<SearchEmbeddableState[key]>;
};

export type SearchEmbeddableSerializedAttributes = Omit<
  SearchEmbeddableState,
  'rows' | 'columnsMeta' | 'totalHitCount' | 'searchSource'
> &
  Pick<SerializableSavedSearch, 'serializedSearchSource'>;

export type SearchEmbeddableSerializedState = SerializedTitles &
  SerializedTimeRange &
  Partial<Pick<SavedSearchAttributes, (typeof EDITABLE_SAVED_SEARCH_KEYS)[number]>> & {
    // by value
    attributes?: SavedSearchAttributes & { references: SavedSearch['references'] };
    // by reference
    savedObjectId?: string;
  };

export type SearchEmbeddableRuntimeState = SearchEmbeddableSerializedAttributes &
  SerializedTitles &
  SerializedTimeRange & {
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
