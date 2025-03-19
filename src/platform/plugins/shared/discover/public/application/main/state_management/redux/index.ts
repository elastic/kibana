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
  appendAdHocDataViews,
  replaceAdHocDataViewWithId,
  setAdHocDataViews,
  setDataView,
  setDefaultProfileAdHocDataViews,
} from './actions';

export type { DiscoverInternalState, InternalStateDataRequestParams } from './types';

export { type InternalStateStore, createInternalStateStore } from './internal_state';

export const internalStateActions = {
  ...omit(internalStateSlice.actions, 'setDataViewId', 'setDefaultProfileAdHocDataViewIds'),
  setDataView,
  setAdHocDataViews,
  setDefaultProfileAdHocDataViews,
  appendAdHocDataViews,
  replaceAdHocDataViewWithId,
};

export {
  InternalStateProvider,
  useInternalStateDispatch,
  useInternalStateSelector,
  useDataViewsForPicker,
} from './hooks';

export {
  type RuntimeStateManager,
  createRuntimeStateManager,
  useRuntimeState,
  RuntimeStateProvider,
  useCurrentDataView,
  useAdHocDataViews,
} from './runtime_state';
