/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefreshInterval } from '@kbn/data-plugin/common';
import type { DataViewListItem } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { Filter, TimeRange } from '@kbn/es-query';
import type { UnifiedHistogramVisContext } from '@kbn/unified-histogram-plugin/public';
import type { UnifiedHistogramLayoutProps } from '@kbn/unified-histogram-plugin/public/layout/layout';
import type { TabItem } from '@kbn/unified-tabs';

export enum LoadingStatus {
  Uninitialized = 'uninitialized',
  Loading = 'loading',
  LoadingMore = 'loading_more',
  Complete = 'complete',
  Error = 'error',
}

type RequestState<
  TResult extends {},
  TLoadingStatus extends LoadingStatus = Exclude<LoadingStatus, LoadingStatus.LoadingMore>
> =
  | {
      loadingStatus: Exclude<TLoadingStatus, LoadingStatus.Error>;
      result: TResult;
    }
  | {
      loadingStatus: LoadingStatus.Error;
      error: Error;
    };

export type DocumentsRequest = RequestState<DataTableRecord[], LoadingStatus>;
export type TotalHitsRequest = RequestState<number>;
export type ChartRequest = RequestState<{}>;

export interface InternalStateDataRequestParams {
  timeRangeAbsolute?: TimeRange;
  timeRangeRelative?: TimeRange;
  searchSessionId?: string;
}

export interface TabState extends TabItem {
  lastPersistedGlobalState: {
    timeRange?: TimeRange;
    refreshInterval?: RefreshInterval;
    filters?: Filter[];
  };
  dataViewId: string | undefined;
  isDataViewLoading: boolean;
  dataRequestParams: InternalStateDataRequestParams;
  overriddenVisContextAfterInvalidation: UnifiedHistogramVisContext | {} | undefined; // it will be used during saved search saving
  resetDefaultProfileState: {
    resetId: string;
    columns: boolean;
    rowHeight: boolean;
    breakdownField: boolean;
  };
  documentsRequest: DocumentsRequest;
  totalHitsRequest: TotalHitsRequest;
  chartRequest: ChartRequest;
  unifiedHistogramLayoutProps: Omit<UnifiedHistogramLayoutProps, 'container' | 'chartPanel'>;
}

export interface DiscoverInternalState {
  initializationState: { hasESData: boolean; hasUserDataView: boolean };
  savedDataViews: DataViewListItem[];
  defaultProfileAdHocDataViewIds: string[];
  expandedDoc: DataTableRecord | undefined;
  isESQLToDataViewTransitionModalVisible: boolean;
  tabs: {
    byId: Record<string, TabState>;
    allIds: string[];
    /**
     * WARNING: You probably don't want to use this property.
     * This is used high in the component tree for managing tabs,
     * but is unsafe to use in actions and selectors since it can
     * change between renders and leak state between tabs.
     * Actions and selectors should use a tab ID parameter instead.
     */
    unsafeCurrentId: string;
  };
}
