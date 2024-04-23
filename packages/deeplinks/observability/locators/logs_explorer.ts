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

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FilterControls = {
  namespace?: ListFilterControl;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ListFilterControl = {
  mode: 'include';
  values: string[];
};

export const LOGS_EXPLORER_LOCATOR_ID = 'LOGS_EXPLORER_LOCATOR';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DocumentFieldGridColumnOptions = {
  type: 'document-field';
  field: string;
  width?: number;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SmartFieldGridColumnOptions = {
  type: 'smart-field';
  smartField: 'content' | 'resource';
  width?: number;
};

export type GridColumnDisplayOptions = DocumentFieldGridColumnOptions | SmartFieldGridColumnOptions;

export interface LogsExplorerNavigationParams extends SerializableRecord {
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
  columns?: GridColumnDisplayOptions[];
  /**
   * Optionally apply free-form filters.
   */
  filters?: Filter[];
  /**
   * Optionally apply curated filter controls
   */
  filterControls?: FilterControls;
}

export interface LogsExplorerLocatorParams extends LogsExplorerNavigationParams {
  /**
   * Dataset name to be selected.
   */
  dataset?: string;
}
