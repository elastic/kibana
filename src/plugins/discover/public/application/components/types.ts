/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject } from 'kibana/public';
import { IndexPattern } from '../../../../data/common/index_patterns/index_patterns';
import { IndexPatternAttributes, ISearchSource } from '../../../../data/public';
import { SavedSearch } from '../../saved_searches';

import { DiscoverServices } from '../../build_services';

export interface DiscoverProps {
  /**
   * Current IndexPattern
   */
  indexPattern: IndexPattern;

  opts: {
    /**
     * Use angular router for navigation
     */
    navigateTo: () => void;
    /**
     * List of available index patterns
     */
    indexPatternList: Array<SavedObject<IndexPatternAttributes>>;
    /**
     * Reload current Angular route, used for switching index patterns, legacy
     */
    routeReload: () => void;
    /**
     * Kibana core services used by discover
     */
    services: DiscoverServices;
    /**
     * Current instance of SavedSearch
     */
    savedSearch: SavedSearch;
  };
  /**
   * Function to reset the current query
   */
  resetQuery: () => void;
  /**
   * Instance of SearchSource, the high level search API
   */
  searchSource: ISearchSource;
}
