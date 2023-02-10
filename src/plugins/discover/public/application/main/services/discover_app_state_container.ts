/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createStateContainerReactHelpers,
  ReduxLikeStateContainer,
} from '@kbn/kibana-utils-plugin/common';
import { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { VIEW_MODE } from '@kbn/saved-search-plugin/public';
import { DiscoverGridSettings } from '../../../components/discover_grid/types';

export interface AppState {
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
   * id of the used data view
   */
  index?: string;
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
   * Number of rows in the grid per page
   */
  rowsPerPage?: number;
  /**
   * Breakdown field of chart
   */
  breakdownField?: string;
}

export const { Provider: DiscoverAppStateProvider, useSelector: useAppStateSelector } =
  createStateContainerReactHelpers<ReduxLikeStateContainer<AppState>>();
