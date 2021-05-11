/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import {
  IndexPattern,
  IndexPatternAttributes,
  SavedObject,
} from '../../../../../../../data/common';
import { ISearchSource } from '../../../../../../../data/public';
import { DiscoverSearchSessionManager } from '../../services/discover_search_session';
import { AppState, GetStateReturn } from '../../services/discover_state';
import { SavedSearchSubject } from '../../services/use_saved_search';
import { ChartSubject } from '../../services/use_saved_search_chart';
import { TotalHitsSubject } from '../../services/use_saved_search_total_hits';
import { DiscoverServices } from '../../../../../build_services';
import { SavedSearch } from '../../../../../saved_searches';

export interface DiscoverLayoutProps {
  chart$: ChartSubject;
  hits$: TotalHitsSubject;
  indexPattern: IndexPattern;
  indexPatternList: Array<SavedObject<IndexPatternAttributes>>;
  refetch$: Subject<unknown>;
  resetQuery: () => void;
  navigateTo: (url: string) => void;
  savedSearch$: SavedSearchSubject;
  savedSearch: SavedSearch;
  searchSessionManager: DiscoverSearchSessionManager;
  searchSource: ISearchSource;
  services: DiscoverServices;
  state: AppState;
  stateContainer: GetStateReturn;
}
