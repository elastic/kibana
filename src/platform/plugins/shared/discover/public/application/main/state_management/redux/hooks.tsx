/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { differenceBy } from 'lodash';
import {
  type TypedUseSelectorHook,
  type ReactReduxContextValue,
  Provider as ReduxProvider,
  createDispatchHook,
  createSelectorHook,
} from 'react-redux';
import type { PropsWithChildren } from 'react';
import React, { useMemo, createContext } from 'react';
import { useAdHocDataViews } from './runtime_state';
import type { DiscoverInternalState, TabState } from './types';
import {
  type TabActionPayload,
  type InternalStateDispatch,
  type InternalStateStore,
} from './internal_state';
import { selectTab } from './selectors';
import { type TabActionInjector, createTabActionInjector } from './utils';
import type { ChartPortalNode } from '../../components/chart';

const internalStateContext = createContext<ReactReduxContextValue>(
  // Recommended approach for versions of Redux prior to v9:
  // https://github.com/reduxjs/react-redux/issues/1565#issuecomment-867143221
  null as unknown as ReactReduxContextValue
);

export const InternalStateProvider = ({
  store,
  children,
}: PropsWithChildren<{ store: InternalStateStore }>) => (
  <ReduxProvider store={store} context={internalStateContext}>
    {children}
  </ReduxProvider>
);

export const useInternalStateDispatch: () => InternalStateDispatch =
  createDispatchHook(internalStateContext);

export const useInternalStateSelector: TypedUseSelectorHook<DiscoverInternalState> =
  createSelectorHook(internalStateContext);

interface CurrentTabContextValue {
  currentTabId: string;
  currentChartPortalNode?: ChartPortalNode;
  injectCurrentTab: TabActionInjector;
}

const currentTabContext = createContext<CurrentTabContextValue | undefined>(undefined);

export const CurrentTabProvider = ({
  currentTabId,
  currentChartPortalNode,
  children,
}: PropsWithChildren<{ currentTabId: string; currentChartPortalNode?: ChartPortalNode }>) => {
  const contextValue = useMemo<CurrentTabContextValue>(
    () => ({
      currentTabId,
      currentChartPortalNode,
      injectCurrentTab: createTabActionInjector(currentTabId),
    }),
    [currentChartPortalNode, currentTabId]
  );

  return <currentTabContext.Provider value={contextValue}>{children}</currentTabContext.Provider>;
};

export const useCurrentTabContext = () => {
  const context = React.useContext(currentTabContext);

  if (!context) {
    throw new Error('useCurrentTabContext must be used within a CurrentTabProvider');
  }

  return context;
};

export const useCurrentTabSelector: TypedUseSelectorHook<TabState> = (selector) => {
  const { currentTabId } = useCurrentTabContext();
  return useInternalStateSelector((state) => selector(selectTab(state, currentTabId)));
};

export const useCurrentTabAction = <TPayload extends TabActionPayload, TReturn>(
  actionCreator: (params: TPayload) => TReturn
) => {
  const { injectCurrentTab } = useCurrentTabContext();
  return useMemo(() => injectCurrentTab(actionCreator), [actionCreator, injectCurrentTab]);
};

export const useCurrentChartPortalNode = () => useCurrentTabContext().currentChartPortalNode;

export const useDataViewsForPicker = () => {
  const originalAdHocDataViews = useAdHocDataViews();
  const savedDataViews = useInternalStateSelector((state) => state.savedDataViews);
  const defaultProfileAdHocDataViewIds = useInternalStateSelector(
    (state) => state.defaultProfileAdHocDataViewIds
  );

  return useMemo(() => {
    const managedDataViews = originalAdHocDataViews.filter(
      ({ id }) => id && defaultProfileAdHocDataViewIds.includes(id)
    );
    const adHocDataViews = differenceBy(originalAdHocDataViews, managedDataViews, 'id');

    return { savedDataViews, managedDataViews, adHocDataViews };
  }, [defaultProfileAdHocDataViewIds, originalAdHocDataViews, savedDataViews]);
};
