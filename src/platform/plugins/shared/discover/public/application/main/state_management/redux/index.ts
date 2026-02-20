/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { internalStateSlice, syncLocallyPersistedTabState } from './internal_state';
import * as actions from './actions';

export {
  type DiscoverInternalState,
  type TabState,
  type TabStateGlobalState,
  type DiscoverAppState,
  type InternalStateDataRequestParams,
  type CascadedDocumentsState,
  TabInitializationStatus,
} from './types';

export { DEFAULT_TAB_STATE } from './constants';

export { type InternalStateStore, createInternalStateStore } from './internal_state';

export const internalStateActions = {
  ...omit(internalStateSlice.actions, 'setTabs', 'setDefaultProfileAdHocDataViewIds'),
  ...actions,
  syncLocallyPersistedTabState,
};

export {
  InternalStateProvider,
  useInternalStateDispatch,
  useInternalStateSelector,
  CurrentTabProvider,
  useCurrentTabSelector,
  useAppStateSelector,
  useCurrentTabAction,
  useCurrentChartPortalNode,
  useDataViewsForPicker,
} from './hooks';

export {
  selectAllTabs,
  selectRecentlyClosedTabs,
  selectTab,
  selectTabAppState,
  selectTabCombinedFilters,
  selectIsTabsBarHidden,
  selectHasUnsavedChanges,
} from './selectors';

export {
  type RuntimeStateManager,
  type ReactiveTabRuntimeState,
  type CombinedRuntimeState,
  type InitialUnifiedHistogramLayoutProps,
  DEFAULT_HISTOGRAM_KEY_PREFIX,
  createRuntimeStateManager,
  useRuntimeState,
  selectTabRuntimeState,
  selectIsDataViewUsedInMultipleRuntimeTabStates,
  selectInitialUnifiedHistogramLayoutPropsMap,
  useCurrentTabRuntimeState,
  RuntimeStateProvider,
  useCurrentDataView,
  useAdHocDataViews,
} from './runtime_state';

export {
  type TabActionInjector,
  createTabActionInjector,
  createTabItem,
  getSerializedSearchSourceDataViewDetails,
  parseControlGroupJson,
  extractEsqlVariables,
} from './utils';

export {
  fromSavedObjectTabToTabState,
  fromSavedObjectTabToSavedSearch,
  fromTabStateToSavedObjectTab,
  fromSavedSearchToSavedObjectTab,
} from './tab_mapping_utils';
