/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import { IUiSettingsClient, MountPoint, SavedObject } from 'kibana/public';
import { Chart } from '../angular/helpers/point_series';
import { IndexPattern } from '../../../../data/common/index_patterns/index_patterns';
import { DocViewFilterFn, ElasticSearchHit } from '../doc_views/doc_views_types';
import { AggConfigs } from '../../../../data/common/search/aggs';

import {
  DataPublicPluginStart,
  FilterManager,
  IndexPatternAttributes,
  ISearchSource,
  Query,
  TimeRange,
} from '../../../../data/public';
import { SavedSearch } from '../../saved_searches';
import { AppState } from '../angular/discover_state';
import { TopNavMenuData } from '../../../../navigation/public';

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
   * Function to add a column to state
   */
  onAddColumn: (column: string) => void;
  /**
   * Function to add a filter to state
   */
  onAddFilter: DocViewFilterFn;
  /**
   * Function to change the used time interval of the date histogram
   */
  onChangeInterval: (interval: string) => void;
  /**
   * Function to move a given column to a given index, used in legacy table
   */
  onMoveColumn: (columns: string, newIdx: number) => void;
  /**
   * Function to remove a given column from state
   */
  onRemoveColumn: (column: string) => void;
  /**
   * Function to replace columns in state
   */
  onSetColumns: (columns: string[]) => void;
  /**
   * Function to scroll down the legacy table to the bottom
   */
  onSkipBottomButtonClick: () => void;
  /**
   * Function to change sorting of the table, triggers a fetch
   */
  onSort: (sort: string[][]) => void;
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
   * Function to change the current index pattern
   */
  setIndexPattern: (id: string) => void;
  /**
   * Current app state of URL
   */
  state: AppState;
  /**
   * Function to update the time filter
   */
  timefilterUpdateHandler: (ranges: { from: number; to: number }) => void;
  /**
   * Currently selected time range
   */
  timeRange?: { from: string; to: string };
  /**
   * Menu data of top navigation (New, save ...)
   */
  topNavMenu: TopNavMenuData[];
  /**
   * Function to update the actual query
   */
  updateQuery: (payload: { dateRange: TimeRange; query?: Query }, isUpdate?: boolean) => void;
  /**
   * Function to update the actual savedQuery id
   */
  updateSavedQueryId: (savedQueryId?: string) => void;
}
