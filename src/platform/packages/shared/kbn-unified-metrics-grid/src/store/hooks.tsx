/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import {
  Provider as ReduxProvider,
  createDispatchHook,
  createSelectorHook,
  type TypedUseSelectorHook,
  type ReactReduxContextValue,
} from 'react-redux';
import { createContext } from 'react';
import type { PropsWithChildren } from 'react';
import type { AppDispatch, InternalStateStore } from '.';
import type { MetricsExperienceTabState, MetricsExperienceState } from './types';
import { selectTab } from './selectors/tabs';
import { useTabsContext } from '../context/tabs';
import type { TabActionPayload } from './slices/metrics_grid_slice';

// Create isolated context for metrics grid store
const metricsGridContext = createContext<ReactReduxContextValue>(
  null as unknown as ReactReduxContextValue
);

export const InternalStateProvider = ({
  store,
  children,
}: PropsWithChildren<{ store: InternalStateStore }>) => {
  return (
    <ReduxProvider store={store} context={metricsGridContext}>
      {children}
    </ReduxProvider>
  );
};

export const useAppDispatch = createDispatchHook(metricsGridContext) as () => AppDispatch;
export const useAppSelector: TypedUseSelectorHook<MetricsExperienceState> =
  createSelectorHook(metricsGridContext);

export const useAppWithTabSelector: TypedUseSelectorHook<MetricsExperienceTabState> = (
  selector
) => {
  const { tabId } = useTabsContext();
  return useAppSelector((state) => selector(selectTab(state, tabId)));
};

export const useAppWithTabAction = <TPayload extends TabActionPayload, TReturn>(
  actionCreator: (params: TPayload) => TReturn
) => {
  const { injectCurrentTab } = useTabsContext();
  return useMemo(() => injectCurrentTab(actionCreator), [actionCreator, injectCurrentTab]);
};
