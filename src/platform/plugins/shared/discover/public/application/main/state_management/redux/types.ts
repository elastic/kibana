/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewListItem } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { Filter, TimeRange } from '@kbn/es-query';
import type { UnifiedHistogramVisContext } from '@kbn/unified-histogram-plugin/public';
export interface InternalStateDataRequestParams {
  timeRangeAbsolute?: TimeRange;
  timeRangeRelative?: TimeRange;
}

export interface DiscoverInternalState {
  dataViewId: string | undefined;
  isDataViewLoading: boolean;
  savedDataViews: DataViewListItem[];
  defaultProfileAdHocDataViewIds: string[];
  expandedDoc: DataTableRecord | undefined;
  initialDocViewerTabId?: string;
  customFilters: Filter[];
  dataRequestParams: InternalStateDataRequestParams;
  overriddenVisContextAfterInvalidation: UnifiedHistogramVisContext | {} | undefined; // it will be used during saved search saving
  isESQLToDataViewTransitionModalVisible: boolean;
  resetDefaultProfileState: {
    resetId: string;
    columns: boolean;
    rowHeight: boolean;
    breakdownField: boolean;
    hideChart: boolean;
  };
}
