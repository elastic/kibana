/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefreshInterval, SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { DataViewListItem } from '@kbn/data-views-plugin/public';
import type { ControlPanelsState } from '@kbn/controls-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { Filter, TimeRange } from '@kbn/es-query';
import type { ESQLControlState, ESQLControlVariable } from '@kbn/esql-types';
import type { UnifiedDataTableRestorableState } from '@kbn/unified-data-table';
import type { UnifiedFieldListRestorableState } from '@kbn/unified-field-list';
import type { UnifiedSearchDraft } from '@kbn/unified-search-plugin/public';
import type { UnifiedHistogramVisContext } from '@kbn/unified-histogram';
import type { ESQLEditorRestorableState } from '@kbn/esql-editor';
import type { TabItem } from '@kbn/unified-tabs';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { DiscoverAppState } from '../discover_app_state_container';
import type { DiscoverLayoutRestorableState } from '../../components/layout/discover_layout_restorable_state';

export interface InternalStateDataRequestParams {
  timeRangeAbsolute: TimeRange | undefined;
  timeRangeRelative: TimeRange | undefined;
  searchSessionId: string | undefined;
}

export interface TabStateGlobalState {
  timeRange?: TimeRange;
  refreshInterval?: RefreshInterval;
  filters?: Filter[];
}

export interface TabState extends TabItem {
  // Initial state for the tab (provided before the tab is initialized).
  initialInternalState?: {
    serializedSearchSource?: SerializedSearchSourceFields;
    visContext?: UnifiedHistogramVisContext | {};
    controlGroupJson?: string;
  };
  initialAppState?: DiscoverAppState;

  // The following properties are used to manage the tab's state after it has been initialized.
  globalState: TabStateGlobalState;
  controlGroupState: ControlPanelsState<ESQLControlState> | undefined;
  /**
   * ESQL query variables
   */
  esqlVariables: ESQLControlVariable[] | undefined;
  forceFetchOnSelect: boolean;
  isDataViewLoading: boolean;
  dataRequestParams: InternalStateDataRequestParams;
  overriddenVisContextAfterInvalidation: UnifiedHistogramVisContext | {} | undefined; // it will be used during saved search saving
  resetDefaultProfileState: {
    resetId: string;
    columns: boolean;
    rowHeight: boolean;
    breakdownField: boolean;
    hideChart: boolean;
  };
  uiState: {
    esqlEditor?: Partial<ESQLEditorRestorableState>;
    dataGrid?: Partial<UnifiedDataTableRestorableState>;
    fieldList?: Partial<UnifiedFieldListRestorableState>;
    layout?: Partial<DiscoverLayoutRestorableState>;
    searchDraft?: Partial<UnifiedSearchDraft>;
  };
}

export interface RecentlyClosedTabState extends TabState {
  closedAt: number;
}

export enum TabsBarVisibility {
  default = 'default',
  hidden = 'hidden',
}

export interface DiscoverInternalState {
  initializationState: { hasESData: boolean; hasUserDataView: boolean };
  userId: string | undefined;
  spaceId: string | undefined;
  persistedDiscoverSession: DiscoverSession | undefined;
  hasUnsavedChanges: boolean;
  savedDataViews: DataViewListItem[];
  defaultProfileAdHocDataViewIds: string[];
  expandedDoc: DataTableRecord | undefined;
  initialDocViewerTabId?: string;
  isESQLToDataViewTransitionModalVisible: boolean;
  tabsBarVisibility: TabsBarVisibility;
  tabs: {
    areInitializing: boolean;
    byId: Record<string, TabState>;
    allIds: string[];
    unsavedIds: string[];
    recentlyClosedTabsById: Record<string, RecentlyClosedTabState>;
    recentlyClosedTabIds: string[];
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
