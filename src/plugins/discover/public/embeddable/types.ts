/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISearchSource } from '@kbn/data-plugin/common';
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
  SerializedTitles,
} from '@kbn/presentation-publishing';
import {
  SavedSearch,
  SerializableSavedSearch,
  SortOrder,
} from '@kbn/saved-search-plugin/common/types';
import type { VIEW_MODE } from '@kbn/saved-search-plugin/public';
import { DataTableColumnsMeta } from '@kbn/unified-data-table';
import { BehaviorSubject } from 'rxjs';

import type { DiscoverServices } from '../build_services';
import type { DocTableEmbeddableSearchProps } from '../components/doc_table/doc_table_embeddable';
import type { DiscoverGridEmbeddableSearchProps } from './components/saved_search_grid';

export type SearchEmbeddableAttributes = Pick<
  SerializableSavedSearch,
  | 'serializedSearchSource'
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

export type SearchEmbeddableSerializedState = SerializedTitles &
  Pick<SerializableSavedSearch, 'sort' | 'columns'> & {
    // by value
    attributes?: SearchEmbeddableAttributes;

    // by reference
    savedObjectId?: string;
  };

export type SearchEmbeddableRuntimeState = SearchEmbeddableAttributes &
  SerializedTitles & {
    savedObjectTitle?: string;
    savedObjectId?: string;
    savedObjectDescription?: string;
  };

export type SearchEmbeddableApi = DefaultEmbeddableApi<SearchEmbeddableSerializedState> &
  PublishesDataViews &
  PublishesSavedObjectId &
  PublishesDataLoading &
  PublishesBlockingError &
  PublishesSavedSearchAttributes &
  HasInPlaceLibraryTransforms &
  Partial<HasEditCapabilities & PublishesSavedObjectId>;

export interface PublishesSavedSearchAttributes extends PublishesDataViews, HasSavedSearch {
  rows$: BehaviorSubject<DataTableRecord[]>;
  totalHitCount$: BehaviorSubject<number | undefined>;
  columns$: BehaviorSubject<string[] | undefined>;
  columnsMeta$: BehaviorSubject<DataTableColumnsMeta | undefined>;
  sort$: BehaviorSubject<SortOrder[] | undefined>;
  sampleSize$: BehaviorSubject<number | undefined>;
  searchSource$: BehaviorSubject<ISearchSource>;
  rowHeight$: BehaviorSubject<number | undefined>;
  headerRowHeight$: BehaviorSubject<number | undefined>;
  rowsPerPage$: BehaviorSubject<number | undefined>;
  savedSearchViewMode$: BehaviorSubject<VIEW_MODE | undefined>;
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
