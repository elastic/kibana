/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Filter, FilterCompareOptions, Query } from '@kbn/es-query';
import { COMPARE_ALL_OPTIONS, compareFilters, isOfAggregateQueryType } from '@kbn/es-query';
import type { SavedSearch, VIEW_MODE } from '@kbn/saved-search-plugin/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { isEqual, omit } from 'lodash';
import type { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
import type { DataGridDensity } from '@kbn/unified-data-table';
import type { DataView } from '@kbn/data-views-plugin/common';
import defaultComparator from 'fast-deep-equal';
import type { DiscoverServices } from '../../../build_services';
import { cleanupUrlState } from './utils/cleanup_url_state';
import { getStateDefaults } from './utils/get_state_defaults';
import { handleSourceColumnState } from '../../../utils/state_helpers';
import type { DiscoverDataSource } from '../../../../common/data_sources';
import { createEsqlDataSource, isEsqlSource } from '../../../../common/data_sources';
import { useCurrentTabSelector } from './redux';
import { APP_STATE_URL_KEY } from '../../../../common';

export interface DiscoverAppState {
  /**
   * Columns displayed in the table
   */
  columns?: string[];
  /**
   * Array of applied filters
   */
  filters?: Filter[];
  /**
   * Data Grid related state
   */
  grid?: DiscoverGridSettings;
  /**
   * Hide chart
   */
  hideChart?: boolean;

  /**
   * The current data source
   */
  dataSource?: DiscoverDataSource;
  /**
   * Used interval of the histogram
   */
  interval?: string;
  /**
   * Lucence or KQL query
   */
  query?: Query | AggregateQuery;
  /**
   * Array of the used sorting [[field,direction],...]
   */
  sort?: string[][];
  /**
   * id of the used saved query
   */
  savedQuery?: string;
  /**
   * Table view: Documents vs Field Statistics
   */
  viewMode?: VIEW_MODE;
  /**
   * Hide mini distribution/preview charts when in Field Statistics mode
   */
  hideAggregatedPreview?: boolean;
  /**
   * Document explorer row height option
   */
  rowHeight?: number;
  /**
   * Document explorer header row height option
   */
  headerRowHeight?: number;
  /**
   * Number of rows in the grid per page
   */
  rowsPerPage?: number;
  /**
   * Custom sample size
   */
  sampleSize?: number;
  /**
   * Breakdown field of chart
   */
  breakdownField?: string;
  /**
   * Density of table
   */
  density?: DataGridDensity;
}

export interface AppStateUrl extends Omit<DiscoverAppState, 'sort'> {
  /**
   * Necessary to take care of legacy links [fieldName,direction]
   */
  sort?: string[][] | [string, string];
  /**
   * Legacy data view ID prop
   */
  index?: string;
}

export const useAppStateSelector = <T>(selector: (state: DiscoverAppState) => T): T =>
  useCurrentTabSelector((tab) => selector(tab.appState), defaultComparator);

export function getCurrentUrlState(stateStorage: IKbnUrlStateStorage, services: DiscoverServices) {
  return (
    cleanupUrlState(stateStorage.get<AppStateUrl>(APP_STATE_URL_KEY) ?? {}, services.uiSettings) ??
    {}
  );
}

export function getInitialState({
  initialUrlState,
  savedSearch,
  overrideDataView,
  services,
}: {
  initialUrlState: DiscoverAppState | undefined;
  savedSearch: SavedSearch | undefined;
  overrideDataView?: DataView | undefined;
  services: DiscoverServices;
}) {
  const defaultAppState = getStateDefaults({
    savedSearch,
    overrideDataView,
    services,
  });
  const mergedState = { ...defaultAppState, ...initialUrlState };

  // https://github.com/elastic/kibana/issues/122555
  if (typeof mergedState.hideChart !== 'boolean') {
    mergedState.hideChart = undefined;
  }

  // Don't allow URL state to overwrite the data source if there's an ES|QL query
  if (isOfAggregateQueryType(mergedState.query) && !isEsqlSource(mergedState.dataSource)) {
    mergedState.dataSource = createEsqlDataSource();
  }

  return handleSourceColumnState(mergedState, services.uiSettings);
}

/**
 * Helper function to compare 2 different filter states
 */
export function isEqualFilters(
  filtersA?: Filter[] | Filter,
  filtersB?: Filter[] | Filter,
  comparatorOptions: FilterCompareOptions = COMPARE_ALL_OPTIONS
) {
  if (!filtersA && !filtersB) {
    return true;
  } else if (!filtersA || !filtersB) {
    return false;
  }
  return compareFilters(filtersA, filtersB, comparatorOptions);
}

/**
 * Helper function to compare 2 different state, is needed since comparing filters
 * works differently
 */
export function isEqualState(
  stateA: DiscoverAppState,
  stateB: DiscoverAppState,
  exclude: Array<keyof DiscoverAppState> = []
) {
  if (!stateA && !stateB) {
    return true;
  } else if (!stateA || !stateB) {
    return false;
  }

  const { filters: stateAFilters = [], ...stateAPartial } = omit(stateA, exclude as string[]);
  const { filters: stateBFilters = [], ...stateBPartial } = omit(stateB, exclude as string[]);

  return isEqual(stateAPartial, stateBPartial) && isEqualFilters(stateAFilters, stateBFilters);
}
