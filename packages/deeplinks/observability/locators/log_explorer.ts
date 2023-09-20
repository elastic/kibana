/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter, TimeRange, Query, AggregateQuery } from '@kbn/es-query';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RefreshInterval = {
  pause: boolean;
  value: number;
};

export const LOG_EXPLORER_LOCATOR_ID = 'LOG_EXPLORER_LOCATOR';

export interface LogExplorerNavigationParams extends SerializableRecord {
  /**
   * Optionally set the time range in the time picker.
   */
  timeRange?: TimeRange;
  /**
   * Optionally set the refresh interval.
   */
  refreshInterval?: RefreshInterval;
  /**
   * Optionally set a query.
   */
  query?: Query | AggregateQuery;
  /**
   * Columns displayed in the table
   */
  columns?: string[];
  /**
   * Array of the used sorting [[field,direction],...]
   */
  sort?: string[][];
  /**
   * Optionally apply filters.
   */
  filters?: Filter[];
}

export interface LogExplorerLocatorParams extends LogExplorerNavigationParams {
  /**
   * Dataset name to be selected.
   */
  dataset?: string;
}
