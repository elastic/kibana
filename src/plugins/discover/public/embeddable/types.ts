/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { Embeddable, EmbeddableOutput, IEmbeddable } from '@kbn/embeddable-plugin/public';
import type { SearchByReferenceInput, SearchByValueInput } from '@kbn/saved-search-plugin/public';

import type { Adapters } from '@kbn/embeddable-plugin/public';
import type { HasSavedSearch } from '@kbn/saved-search-plugin/public/services/saved_searches/types';

import type { DiscoverServices } from '../build_services';
import type { DocTableEmbeddableSearchProps } from '../components/doc_table/doc_table_embeddable';
import type { DiscoverGridEmbeddableSearchProps } from './saved_search_grid';

export type SearchInput = SearchByValueInput | SearchByReferenceInput; // TODO: Delete

// export type SearchEmbeddableSerializedState = SerializedTitles & {
//   attributes?: SavedSearchByValueAttributes;
// };

// export type SearchEmbeddableApi = DefaultEmbeddableApi<SearchEmbeddableSerializedState> &
//   HasSavedSearch &
//   HasLibraryTransforms &
//   PublishesDataLoading;

// TODO: Delete
export interface SearchOutput extends EmbeddableOutput {
  indexPatterns?: DataView[];
  editable: boolean;
}
// TODO: Delete
export type ISearchEmbeddable = IEmbeddable<SearchInput, SearchOutput> &
  HasSavedSearch &
  HasTimeRange;

// TODO: Delete
export interface SearchEmbeddable extends Embeddable<SearchInput, SearchOutput> {
  type: string;
}

// export interface HasSavedSearch {
//   getSavedSearch: () => SavedSearch | undefined;
// }

// export const apiHasSavedSearch = (
//   api: EmbeddableApiContext['embeddable']
// ): api is HasSavedSearch => {
//   const embeddable = api as HasSavedSearch;
//   console.log('apihassavedsearch');
//   return Boolean(embeddable.getSavedSearch) && typeof embeddable.getSavedSearch === 'function';
// };

export interface HasTimeRange {
  hasTimeRange(): boolean;
}

export type EmbeddableComponentSearchProps = DiscoverGridEmbeddableSearchProps &
  DocTableEmbeddableSearchProps;

export type SearchProps = EmbeddableComponentSearchProps & {
  sampleSizeState: number | undefined;
  description?: string;
  sharedItemTitle?: string;
  inspectorAdapters?: Adapters;
  services: DiscoverServices;
};
