/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import React, { type PropsWithChildren, createContext, useContext, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject } from 'rxjs';
import type { UnifiedHistogramPartialLayoutProps } from '@kbn/unified-histogram';
import { useCurrentTabContext } from './hooks';
import type { DiscoverStateContainer } from '../discover_state';
import type { ConnectedCustomizationService } from '../../../../customizations';
import type { ProfilesManager, ScopedProfilesManager } from '../../../../context_awareness';
import type { TabState } from './types';
import type { DiscoverEBTManager, ScopedDiscoverEBTManager } from '../../../../ebt_manager';

interface DiscoverRuntimeState {
  adHocDataViews: DataView[];
}

interface TabRuntimeState {
  stateContainer?: DiscoverStateContainer;
  customizationService?: ConnectedCustomizationService;
  unifiedHistogramLayoutProps?: UnifiedHistogramPartialLayoutProps;
  scopedProfilesManager: ScopedProfilesManager;
  scopedEbtManager: ScopedDiscoverEBTManager;
  currentDataView: DataView;
}

type ReactiveRuntimeState<TState, TNullable extends keyof TState = never> = {
  [key in keyof TState & string as `${key}$`]: BehaviorSubject<
    key extends TNullable ? TState[key] | undefined : TState[key]
  >;
};

type ReactiveTabRuntimeState = ReactiveRuntimeState<TabRuntimeState, 'currentDataView'>;

export type RuntimeStateManager = ReactiveRuntimeState<DiscoverRuntimeState> & {
  tabs: { byId: Record<string, ReactiveTabRuntimeState> };
};

export const createRuntimeStateManager = (): RuntimeStateManager => ({
  adHocDataViews$: new BehaviorSubject<DataView[]>([]),
  tabs: { byId: {} },
});

export type InitialUnifiedHistogramLayoutProps = Pick<
  UnifiedHistogramPartialLayoutProps,
  'topPanelHeight'
>;

export const createTabRuntimeState = ({
  profilesManager,
  ebtManager,
  initialValues,
}: {
  profilesManager: ProfilesManager;
  ebtManager: DiscoverEBTManager;
  initialValues?: {
    unifiedHistogramLayoutProps?: InitialUnifiedHistogramLayoutProps;
  };
}): ReactiveTabRuntimeState => {
  const scopedEbtManager = ebtManager.createScopedEBTManager();

  return {
    stateContainer$: new BehaviorSubject<DiscoverStateContainer | undefined>(undefined),
    customizationService$: new BehaviorSubject<ConnectedCustomizationService | undefined>(
      undefined
    ),
    unifiedHistogramLayoutProps$: new BehaviorSubject<
      UnifiedHistogramPartialLayoutProps | undefined
    >(initialValues?.unifiedHistogramLayoutProps),
    scopedProfilesManager$: new BehaviorSubject(
      profilesManager.createScopedProfilesManager({ scopedEbtManager })
    ),
    scopedEbtManager$: new BehaviorSubject(scopedEbtManager),
    currentDataView$: new BehaviorSubject<DataView | undefined>(undefined),
  };
};

export const useRuntimeState = <T,>(stateSubject$: BehaviorSubject<T>) =>
  useObservable(stateSubject$, stateSubject$.getValue());

export const selectTabRuntimeState = (runtimeStateManager: RuntimeStateManager, tabId: string) =>
  runtimeStateManager.tabs.byId[tabId];

export const selectTabRuntimeAppState = (
  runtimeStateManager: RuntimeStateManager,
  tabId: string
) => {
  const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
  return tabRuntimeState?.stateContainer$.getValue()?.appState?.getState();
};

export const selectTabRuntimeGlobalState = (
  runtimeStateManager: RuntimeStateManager,
  tabId: string
): TabState['lastPersistedGlobalState'] | undefined => {
  const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
  const globalState = tabRuntimeState?.stateContainer$.getValue()?.globalState?.get();

  if (!globalState) {
    return undefined;
  }

  const { time: timeRange, refreshInterval, filters } = globalState;
  return {
    timeRange,
    refreshInterval,
    filters,
  };
};

export const selectRestorableTabRuntimeHistogramLayoutProps = (
  runtimeStateManager: RuntimeStateManager,
  tabId: string
): InitialUnifiedHistogramLayoutProps | undefined => {
  const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
  const layoutProps = tabRuntimeState?.unifiedHistogramLayoutProps$?.getValue();
  return layoutProps ? { topPanelHeight: layoutProps.topPanelHeight } : undefined;
};

export const useCurrentTabRuntimeState = <T,>(
  runtimeStateManager: RuntimeStateManager,
  selector: (tab: ReactiveTabRuntimeState) => BehaviorSubject<T>
) => {
  const { currentTabId } = useCurrentTabContext();
  return useRuntimeState(selector(selectTabRuntimeState(runtimeStateManager, currentTabId)));
};

export type CombinedRuntimeState = DiscoverRuntimeState &
  Omit<TabRuntimeState, 'scopedProfilesManager' | 'scopedEbtManager'>;

const runtimeStateContext = createContext<CombinedRuntimeState | undefined>(undefined);

export const RuntimeStateProvider = ({
  currentDataView,
  adHocDataViews,
  children,
}: PropsWithChildren<CombinedRuntimeState>) => {
  const runtimeState = useMemo<CombinedRuntimeState>(
    () => ({ currentDataView, adHocDataViews }),
    [adHocDataViews, currentDataView]
  );

  return (
    <runtimeStateContext.Provider value={runtimeState}>{children}</runtimeStateContext.Provider>
  );
};

const useRuntimeStateContext = () => {
  const context = useContext(runtimeStateContext);

  if (!context) {
    throw new Error('useRuntimeStateContext must be used within a RuntimeStateProvider');
  }

  return context;
};

export const useCurrentDataView = () => useRuntimeStateContext().currentDataView;
export const useAdHocDataViews = () => useRuntimeStateContext().adHocDataViews;
