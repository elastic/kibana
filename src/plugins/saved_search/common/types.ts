/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ISearchSource, RefreshInterval, TimeRange } from '@kbn/data-plugin/common';
import type { SavedObjectReference } from '@kbn/core-saved-objects-server';
import type { SavedObjectsResolveResponse } from '@kbn/core/server';
import { VIEW_MODE } from '.';

export interface DiscoverGridSettings {
  columns?: Record<string, DiscoverGridSettingsColumn>;
}

export interface DiscoverGridSettingsColumn {
  width?: number;
}

/** @internal **/
export interface SavedSearchAttributes {
  title: string;
  sort: Array<[string, string]>;
  columns: string[];
  description: string;
  grid: {
    columns?: Record<string, DiscoverGridSettingsColumn>;
  };
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
  breakdownField?: string;
}

/** @internal **/
export type SortOrder = [string, string];

/** @public **/
export interface SavedSearch {
  searchSource: ISearchSource;
  id?: string;
  title?: string;
  sort?: SortOrder[];
  columns?: string[];
  description?: string;
  tags?: string[] | undefined;
  grid?: {
    columns?: Record<string, DiscoverGridSettingsColumn>;
  };
  hideChart?: boolean;
  viewMode?: VIEW_MODE;
  hideAggregatedPreview?: boolean;
  rowHeight?: number;
  isTextBasedQuery?: boolean;
  usesAdHocDataView?: boolean;

  // for restoring time range with a saved search
  timeRestore?: boolean;
  timeRange?: TimeRange;
  refreshInterval?: RefreshInterval;

  rowsPerPage?: number;
  breakdownField?: string;
  references?: SavedObjectReference[];
  sharingSavedObjectProps?: {
    outcome?: SavedObjectsResolveResponse['outcome'];
    aliasTargetId?: SavedObjectsResolveResponse['alias_target_id'];
    aliasPurpose?: SavedObjectsResolveResponse['alias_purpose'];
    errorJSON?: string;
  };
}
