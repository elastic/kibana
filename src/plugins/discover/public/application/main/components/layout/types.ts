/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Query, TimeRange, SavedObject } from '@kbn/data-plugin/public';
import type { DataView, DataViewAttributes } from '@kbn/data-views-plugin/public';
import { ISearchSource } from '@kbn/data-plugin/public';
import { RequestAdapter } from '@kbn/inspector-plugin';
import { AppState, GetStateReturn } from '../../services/discover_state';
import { DataRefetch$, SavedSearchData } from '../../utils/use_saved_search';
import { SavedSearch } from '../../../../services/saved_searches';
import { ElasticSearchHit } from '../../../../types';

export interface DiscoverLayoutProps {
  indexPattern: DataView;
  indexPatternList: Array<SavedObject<DataViewAttributes>>;
  inspectorAdapters: { requests: RequestAdapter };
  navigateTo: (url: string) => void;
  onChangeIndexPattern: (id: string) => void;
  onUpdateQuery: (payload: { dateRange: TimeRange; query?: Query }, isUpdate?: boolean) => void;
  resetSavedSearch: () => void;
  expandedDoc?: ElasticSearchHit;
  setExpandedDoc: (doc?: ElasticSearchHit) => void;
  savedSearch: SavedSearch;
  savedSearchData$: SavedSearchData;
  savedSearchRefetch$: DataRefetch$;
  searchSource: ISearchSource;
  state: AppState;
  stateContainer: GetStateReturn;
}
