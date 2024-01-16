/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DiscoverGridSettings as SearchDiscoverGridSettings } from '@kbn/saved-search/types';
import { VIEW_MODE } from '@kbn/saved-search/types';
import type { RefreshInterval, TimeRange } from '@kbn/data-plugin/common';
export type {
  SavedSearchCommon,
  SortOrder,
  DiscoverGridSettingsColumn,
  DiscoverGridSettings,
} from '@kbn/saved-search/types';

/** @internal **/
export interface SavedSearchAttributes {
  title: string;
  sort: Array<[string, string]>;
  columns: string[];
  description: string;
  grid: SearchDiscoverGridSettings;
  hideChart: boolean;
  isTextBasedQuery: boolean;
  usesAdHocDataView?: boolean;
  kibanaSavedObjectMeta: {
    searchSourceJSON: string;
  };
  viewMode?: VIEW_MODE;
  hideAggregatedPreview?: boolean;
  rowHeight?: number;

  timeRestore?: boolean;
  timeRange?: Pick<TimeRange, 'from' | 'to'>;
  refreshInterval?: RefreshInterval;

  rowsPerPage?: number;
  sampleSize?: number;
  breakdownField?: string;
}
