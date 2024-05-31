/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISearchSource, SearchSource } from '@kbn/data-plugin/common';
import { DataTableRecord } from '@kbn/discover-utils/types';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import {
  EmbeddableApiContext,
  HasEditCapabilities,
  HasExecutionContext,
  HasInPlaceLibraryTransforms,
  HasLibraryTransforms,
  HasParentApi,
  PublishesBlockingError,
  PublishesDataLoading,
  PublishesDataViews,
  PublishesSavedObjectId,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/common/types';
import type { SavedSearchByValueAttributes, VIEW_MODE } from '@kbn/saved-search-plugin/public';
import { BehaviorSubject } from 'rxjs';

import type { DiscoverServices } from '../build_services';
import type { DocTableEmbeddableSearchProps } from '../components/doc_table/doc_table_embeddable';
import type { DiscoverGridEmbeddableSearchProps } from './components/saved_search_grid';

export type SearchEmbeddableSerializedState = SerializedTitles & {
  // by value
  attributes?: SavedSearchByValueAttributes;

  // by reference
  savedObjectId?: string;
};

export type SearchEmbeddableAttributes = Pick<
  SavedSearch,
  | 'searchSource'
  | 'managed'
  | 'rowHeight'
  | 'rowsPerPage'
  | 'headerRowHeight'
  | 'columns'
  | 'sort'
  | 'sampleSize'
  | 'breakdownField'
  | 'viewMode'
>;

export type SearchEmbeddableRuntimeState = SearchEmbeddableAttributes &
  SerializedTitles & { savedObjectId?: string };

// export type SearchEmbeddableRuntimeState = Omit<
//   SavedSearchByValueAttributes,
//   | 'title'
//   | 'description'
//   | 'kibanaSavedObjectMeta'
//   | 'visContext'
//   | 'timeRestore'
//   | 'refreshInterval'
// > &
//   SerializedTitles & { savedObjectId?: string };

export type SearchEmbeddableApi = DefaultEmbeddableApi<SearchEmbeddableSerializedState> &
  // HasSavedSearch &
  // HasSearchSource &
  PublishesDataViews &
  PublishesSavedObjectId &
  PublishesDataLoading &
  PublishesBlockingError &
  PublishesSavedSearchAttributes &
  HasInPlaceLibraryTransforms &
  // PublishesSearchSession
  // PublishesTimeRange & HasParentApi<Partial<PublishesUnifiedSearch & PublishesSearchSession>>
  Partial<HasEditCapabilities & PublishesSavedObjectId>;
// HasParentApi<HasExecutionContext>;

export interface PublishesSavedSearchAttributes extends PublishesDataViews, HasSavedSearch {
  rows$: BehaviorSubject<DataTableRecord[]>;
  columns$: BehaviorSubject<string[] | undefined>;
  sort$: BehaviorSubject<SortOrder | undefined>;
  sampleSize$: BehaviorSubject<number | undefined>;
  searchSource$: BehaviorSubject<ISearchSource>;
  savedSearchViewMode$: BehaviorSubject<VIEW_MODE | undefined>;
  // dataViewId$: BehaviorSubject<string | undefined>;
}

export interface HasSavedSearch {
  getSavedSearch: () => SavedSearch;
}

export const apiHasSavedSearch = (
  api: EmbeddableApiContext['embeddable']
): api is HasSavedSearch => {
  const embeddable = api as HasSavedSearch;
  return Boolean(embeddable.getSavedSearch) && typeof embeddable.getSavedSearch === 'function';
};

export interface HasTimeRange {
  hasTimeRange(): boolean;
}

export type EmbeddableComponentSearchProps = DiscoverGridEmbeddableSearchProps &
  DocTableEmbeddableSearchProps;

export type SearchProps = EmbeddableComponentSearchProps & {
  sampleSizeState: number | undefined;
  sharedItemTitle?: string;
  services: DiscoverServices;
};
