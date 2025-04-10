/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { internalStateSlice } from './internal_state';
import {
  loadDataViewList,
  appendAdHocDataViews,
  initializeSession,
  replaceAdHocDataViewWithId,
  setAdHocDataViews,
  setDataView,
  setDefaultProfileAdHocDataViews,
  setTabs,
  updateTabs,
  disconnectTab,
} from './actions';

export type { DiscoverInternalState, TabState, InternalStateDataRequestParams } from './types';

export { type InternalStateStore, createInternalStateStore } from './internal_state';

export const internalStateActions = {
  ...omit(
    internalStateSlice.actions,
    'setTabs',
    'setDataViewId',
    'setDefaultProfileAdHocDataViewIds'
  ),
  loadDataViewList,
  setTabs,
  updateTabs,
  disconnectTab,
  setDataView,
  setAdHocDataViews,
  setDefaultProfileAdHocDataViews,
  appendAdHocDataViews,
  replaceAdHocDataViewWithId,
  initializeSession,
};

export {
  InternalStateProvider,
  useInternalStateDispatch,
  useInternalStateSelector,
  CurrentTabProvider,
  useCurrentTabSelector,
  useCurrentTabAction,
  useDataViewsForPicker,
} from './hooks';

export { selectAllTabs, selectTab } from './selectors';

export {
  type RuntimeStateManager,
  createRuntimeStateManager,
  useRuntimeState,
  selectTabRuntimeState,
  useCurrentTabRuntimeState,
  RuntimeStateProvider,
  useCurrentDataView,
  useAdHocDataViews,
} from './runtime_state';

export { type TabActionInjector, createTabActionInjector, createTabItem } from './utils';
