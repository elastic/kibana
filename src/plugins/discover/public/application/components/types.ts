/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient, SavedObject } from 'kibana/public';
import { IndexPattern } from '../../../../data/common/index_patterns/index_patterns';
import {
  DataPublicPluginStart,
  FilterManager,
  IndexPatternAttributes,
  ISearchSource,
} from '../../../../data/public';
import { SavedSearch } from '../../saved_searches';

import { DiscoverServices } from '../../build_services';

export interface DiscoverProps {
  /**
   * Current IndexPattern
   */
  indexPattern: IndexPattern;

  opts: {
    /**
     * Client of uiSettings
     */
    config: IUiSettingsClient;
    /**
     * Use angular router for navigation
     */
    navigateTo: () => void;
    /**
     * Data plugin
     */
    data: DataPublicPluginStart;
    /**
     * Data plugin filter manager
     */
    filterManager: FilterManager;
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
     * The number of documents that can be displayed in the table/grid
     */
    sampleSize: number;
    /**
     * Current instance of SavedSearch
     */
    savedSearch: SavedSearch;
    /**
     * Timefield of the currently used index pattern
     */
    timefield: string;
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
