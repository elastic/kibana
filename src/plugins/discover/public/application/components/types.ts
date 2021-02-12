/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient, MountPoint, SavedObject } from 'kibana/public';
import { Subject } from 'rxjs';
import { Chart } from '../angular/helpers/point_series';
import { IndexPattern } from '../../../../data/common/index_patterns/index_patterns';
import { ElasticSearchHit } from '../doc_views/doc_views_types';
import { AggConfigs } from '../../../../data/common/search/aggs';

import {
  DataPublicPluginStart,
  FilterManager,
  IndexPatternAttributes,
  ISearchSource,
} from '../../../../data/public';
import { SavedSearch } from '../../saved_searches';
import { AppState, GetStateReturn } from '../angular/discover_state';
import { RequestAdapter } from '../../../../inspector/common';
import { DiscoverServices } from '../../build_services';
import { DiscoverSearchSessionManager } from '../angular/discover_search_session';

export interface DiscoverProps {
  /**
   * Function to fetch documents from Elasticsearch
   */
  fetch: () => void;
  /**
   * Counter how often data was fetched (used for testing)
   */
  fetchCounter: number;
  /**
   * Error in case of a failing document fetch
   */
  fetchError?: Error;
  /**
   * Statistics by fields calculated using the fetched documents
   */
  fieldCounts: Record<string, number>;
  /**
   * Histogram aggregation data
   */
  histogramData?: Chart;
  /**
   * Number of documents found by recent fetch
   */
  hits: number;
  /**
   * Current IndexPattern
   */
  indexPattern: IndexPattern;
  /**
   * Value needed for legacy "infinite" loading functionality
   * Determins how much records are rendered using the legacy table
   * Increased when scrolling down
   */
  minimumVisibleRows: number;
  /**
   * Function to scroll down the legacy table to the bottom
   */
  onSkipBottomButtonClick: () => void;
  opts: {
    /**
     * Date histogram aggregation config
     */
    chartAggConfigs?: AggConfigs;
    /**
     * Client of uiSettings
     */
    config: IUiSettingsClient;
    /**
     * returns field statistics based on the loaded data sample
     */
    getFieldCounts: () => Promise<Record<string, number>>;
    /**
     * Use angular router for navigation
     */
    navigateTo: () => void;
    /**
     * Inspect, for analyzing requests and responses
     */
    inspectorAdapters: { requests: RequestAdapter };
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
     * Refetch observable
     */
    refetch$: Subject<undefined>;
    /**
     * Kibana core services used by discover
     */
    services: DiscoverServices;
    /**
     * Helps with state management of search session
     */
    searchSessionManager: DiscoverSearchSessionManager;
    /**
     * The number of documents that can be displayed in the table/grid
     */
    sampleSize: number;
    /**
     * Current instance of SavedSearch
     */
    savedSearch: SavedSearch;
    /**
     * Function to set the header menu
     */
    setHeaderActionMenu: (menuMount: MountPoint | undefined) => void;
    /**
     * Timefield of the currently used index pattern
     */
    timefield: string;
    /**
     * Function to set the current state
     */
    setAppState: (state: Partial<AppState>) => void;
    /**
     * State container providing globalState, appState and functions
     */
    stateContainer: GetStateReturn;
  };
  /**
   * Function to reset the current query
   */
  resetQuery: () => void;
  /**
   * Current state of the actual query, one of 'uninitialized', 'loading' ,'ready', 'none'
   */
  resultState: string;
  /**
   * Array of document of the recent successful search request
   */
  rows: ElasticSearchHit[];
  /**
   * Instance of SearchSource, the high level search API
   */
  searchSource: ISearchSource;
  /**
   * Current app state of URL
   */
  state: AppState;
  /**
   * Currently selected time range
   */
  timeRange?: { from: string; to: string };
  /**
   * An object containing properties for proper handling of unmapped fields in the UI
   */
  unmappedFieldsConfig?: {
    /**
     * determines whether to display unmapped fields
     * configurable through the switch in the UI
     */
    showUnmappedFields: boolean;
    /**
     * determines if we should display an option to toggle showUnmappedFields value in the first place
     * this value is not configurable through the UI
     */
    showUnmappedFieldsDefaultValue: boolean;
    /**
     * callback function to change the value of `showUnmappedFields` flag
     * @param value new value to set
     */
    onChangeUnmappedFields: (value: boolean) => void;
  };
}
