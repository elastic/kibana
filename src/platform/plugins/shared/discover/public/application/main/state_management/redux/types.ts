/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefreshInterval } from '@kbn/data-plugin/public';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { DiscoverGridSettings, VIEW_MODE } from '@kbn/saved-search-plugin/common';
import type { VisContextUnmapped } from '@kbn/saved-search-plugin/common/types';
import type { DataGridDensity, SortOrder } from '@kbn/unified-data-table';
import type { UnifiedHistogramVisContext } from '@kbn/unified-histogram-plugin/public';

export interface DiscoverApplicationWideState {
  loadingState: string;
  savedDataViews: DataView[];
  adHocDataViews: DataView[];
  globalFilters: Filter[];
  customFilters: Filter[];
  expandedDoc: DataTableRecord | undefined;
  isESQLToDataViewTransitionModalVisible?: boolean;
  resetDefaultProfileState: {
    resetId: string;
    columns: boolean;
    rowHeight: boolean;
    breakdownField: boolean;
  };
}

export interface DiscoverAllSessionsState {
  byId: Record<string, DiscoverSessionState>;
  allIds: string[];
  currentId: string;
}

export interface DiscoverSessionState {
  /**
   * Metadata
   */
  sessionId?: string;
  title: string;
  description: string;
  tags?: string[] | undefined;
  managed: boolean;

  /**
   * Request data
   */
  dataView: string | DataViewSpec;
  query?: Query | AggregateQuery;
  filters?: Filter[];
  timeRange?: Pick<TimeRange, 'from' | 'to'>;
  timeRangeAbsolute?: TimeRange;
  timeRangeRelative?: TimeRange;
  refreshInterval?: RefreshInterval;

  /**
   * View configuration
   */
  viewMode?: VIEW_MODE;

  /**
   * Grid configuration
   */
  columns: string[];
  sort: SortOrder[];
  grid: DiscoverGridSettings;
  density?: DataGridDensity;
  rowHeight?: number;
  headerRowHeight?: number;
  rowsPerPage?: number;
  sampleSize?: number;

  /**
   * Chart configuration
   */
  hideChart: boolean;
  breakdownField?: string;
  visContext?: VisContextUnmapped;
  overriddenVisContextAfterInvalidation: UnifiedHistogramVisContext | {} | undefined; // it will be used during saved search saving

  /**
   * Flags
   */
  isTextBasedQuery: boolean;
  usesAdHocDataView?: boolean;
  hideAggregatedPreview?: boolean;
  timeRestore?: boolean;
}
