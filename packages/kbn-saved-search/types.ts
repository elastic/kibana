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
import type { SerializableRecord } from '@kbn/utility-types';
import type { ResolvedSimpleSavedObject } from '@kbn/core-saved-objects-api-browser';

export enum VIEW_MODE {
  DOCUMENT_LEVEL = 'documents',
  AGGREGATED_LEVEL = 'aggregated',
}

export interface DiscoverGridSettings extends SerializableRecord {
  columns?: Record<string, DiscoverGridSettingsColumn>;
}

export interface DiscoverGridSettingsColumn extends SerializableRecord {
  width?: number;
}

export type SortOrder = [string, string];

export interface SavedSearchCommon {
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
  isTextBasedQuery?: boolean;
  usesAdHocDataView?: boolean;

  // for restoring time range with a saved search
  timeRestore?: boolean;
  timeRange?: TimeRange;
  refreshInterval?: RefreshInterval;

  rowsPerPage?: number;
  sampleSize?: number;
  breakdownField?: string;
  references?: SavedObjectReference[];
  sharingSavedObjectProps?: {
    outcome?: SavedObjectsResolveResponse['outcome'];
    aliasTargetId?: SavedObjectsResolveResponse['alias_target_id'];
    aliasPurpose?: SavedObjectsResolveResponse['alias_purpose'];
    errorJSON?: string;
  };
}

export interface SavedSearch extends SavedSearchCommon {
  sharingSavedObjectProps?: {
    outcome?: ResolvedSimpleSavedObject['outcome'];
    aliasTargetId?: ResolvedSimpleSavedObject['alias_target_id'];
    aliasPurpose?: ResolvedSimpleSavedObject['alias_purpose'];
    errorJSON?: string;
  };
}
