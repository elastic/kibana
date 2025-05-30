/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter, TimeRange, Query, AggregateQuery } from '@kbn/es-query';
import type { RefreshInterval } from '@kbn/data-plugin/public';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { VIEW_MODE } from './constants';

export const DISCOVER_APP_LOCATOR = 'DISCOVER_APP_LOCATOR';

export interface DiscoverAppLocatorParams extends SerializableRecord {
  /**
   * Optionally set saved search ID.
   */
  savedSearchId?: string;

  /**
   * Optionally set index pattern / data view ID.
   */
  dataViewId?: string;
  /**
   * Duplication of dataViewId
   * @deprecated
   */
  indexPatternId?: string;
  dataViewSpec?: DataViewSpec;

  /**
   * Optionally set the time range in the time picker.
   */
  timeRange?: TimeRange;

  /**
   * Optionally set the refresh interval.
   */
  refreshInterval?: RefreshInterval & SerializableRecord;

  /**
   * Optionally apply filters.
   */
  filters?: Filter[];

  /**
   * Optionally set a query.
   */
  query?: Query | AggregateQuery;

  /**
   * If not given, will use the uiSettings configuration for `storeInSessionStorage`. useHash determines
   * whether to hash the data in the url to avoid url length issues.
   */
  useHash?: boolean;

  /**
   * Background search session id
   */
  searchSessionId?: string;

  /**
   * Columns displayed in the table
   */
  columns?: string[];

  /**
   * Data Grid related state
   */
  grid?: DiscoverGridSettings;

  /**
   * Used interval of the histogram
   */
  interval?: string;

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
   * Breakdown field
   */
  breakdownField?: string;
  /**
   * Used when navigating to particular alert results
   */
  isAlertResults?: boolean;
}

export type DiscoverAppLocator = LocatorPublic<DiscoverAppLocatorParams>;

/**
 * Location state of scoped history (history instance of Kibana Platform application service)
 */
export interface MainHistoryLocationState {
  dataViewSpec?: DataViewSpec;
  isAlertResults?: boolean;
}

export type DiscoverAppLocatorGetLocation =
  LocatorDefinition<DiscoverAppLocatorParams>['getLocation'];
