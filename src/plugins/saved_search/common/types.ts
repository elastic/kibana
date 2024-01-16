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
import { VIEW_MODE } from '@kbn/saved-search';
import type { DiscoverGridSettings } from '@kbn/saved-search/types';
export type { SavedSearchAttributes } from '@kbn/saved-search/types';

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
  grid?: DiscoverGridSettings;
  hideChart?: boolean;
  viewMode?: VIEW_MODE;
  hideAggregatedPreview?: boolean;
  rowHeight?: number;
  headerRowHeight?: number;
  isTextBasedQuery?: boolean;
  usesAdHocDataView?: boolean;

  // for restoring time range with a saved search
  timeRestore?: boolean;
  timeRange?: TimeRange;
  refreshInterval?: RefreshInterval;

  rowsPerPage?: number;
  sampleSize?: number;
  breakdownField?: string;
  visContextJSON?: string;

  // Whether or not this saved search is managed by the system
  managed: boolean;
  references?: SavedObjectReference[];
  sharingSavedObjectProps?: {
    outcome?: SavedObjectsResolveResponse['outcome'];
    aliasTargetId?: SavedObjectsResolveResponse['alias_target_id'];
    aliasPurpose?: SavedObjectsResolveResponse['alias_purpose'];
    errorJSON?: string;
  };
}
