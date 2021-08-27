/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { SavedObject } from '../../../../../../../../core/types/saved_objects';
import type { Query } from '../../../../../../../data/common';
import { IndexPattern } from '../../../../../../../data/common/index_patterns/index_patterns/index_pattern';
import type { IndexPatternAttributes } from '../../../../../../../data/common/index_patterns/types';
import type { TimeRange } from '../../../../../../../data/common/query/timefilter/types';
import type { ISearchSource } from '../../../../../../../data/common/search/search_source/types';
import { RequestAdapter } from '../../../../../../../inspector/common/adapters/request/request_adapter';
import type { DiscoverServices } from '../../../../../build_services';
import type { SavedSearch } from '../../../../../saved_searches/types';
import type { AppState, GetStateReturn } from '../../services/discover_state';
import type { DataRefetch$, SavedSearchData } from '../../services/use_saved_search';

export interface DiscoverLayoutProps {
  indexPattern: IndexPattern;
  indexPatternList: Array<SavedObject<IndexPatternAttributes>>;
  inspectorAdapters: { requests: RequestAdapter };
  navigateTo: (url: string) => void;
  onChangeIndexPattern: (id: string) => void;
  onUpdateQuery: (payload: { dateRange: TimeRange; query?: Query }, isUpdate?: boolean) => void;
  resetQuery: () => void;
  savedSearch: SavedSearch;
  savedSearchData$: SavedSearchData;
  savedSearchRefetch$: DataRefetch$;
  searchSource: ISearchSource;
  services: DiscoverServices;
  state: AppState;
  stateContainer: GetStateReturn;
}
