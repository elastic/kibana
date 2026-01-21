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
import { BehaviorSubject, type Observable, from } from 'rxjs';
import type { UnifiedHistogramPartialLayoutProps } from '@kbn/unified-histogram';
import { useCurrentTabContext } from './hooks';
import type { DiscoverStateContainer } from '../discover_state';
import type { ConnectedCustomizationService } from '../../../../customizations';
import type { ProfilesManager, ScopedProfilesManager } from '../../../../context_awareness';
import type { UrlSyncObservables, DiscoverInternalState, TabState } from './types';
import type { DiscoverEBTManager, ScopedDiscoverEBTManager } from '../../../../ebt_manager';
import { selectTab } from './selectors';
import type { InternalStateStore } from './internal_state';

interface DiscoverRuntimeState {
  adHocDataViews: DataView[];
}

export const DEFAULT_HISTOGRAM_KEY_PREFIX = 'discover';

export interface UnifiedHistogramConfig {
  localStorageKeyPrefix?: string;
  layoutPropsMap: Record<string, UnifiedHistogramPartialLayoutProps | undefined>;
}

interface TabRuntimeState {
  stateContainer?: DiscoverStateContainer;
  customizationService?: ConnectedCustomizationService;
  unifiedHistogramConfig: UnifiedHistogramConfig;
  scopedProfilesManager: ScopedProfilesManager;
  scopedEbtManager: ScopedDiscoverEBTManager;
  currentDataView: DataView;
}

type ReactiveRuntimeState<TState, TNullable extends keyof TState = never> = {
  [key in keyof TState & string as `${key}$`]: BehaviorSubject<
    key extends TNullable ? TState[key] | undefined : TState[key]
  >;
};

export type ReactiveTabRuntimeState = ReactiveRuntimeState<TabRuntimeState, 'currentDataView'> & {
  readonly urlSyncObservables: UrlSyncObservables;
  onSubscribe: ({ unsubscribeFn }: { unsubscribeFn: () => void }) => void;
  unsubscribe: () => void;
};

export type RuntimeStateManager = ReactiveRuntimeState<DiscoverRuntimeState> & {
  tabs: { byId: Record<string, ReactiveTabRuntimeState> };
  internalState$: Observable<DiscoverInternalState> | undefined;
  setInternalState$: (internalState: InternalStateStore) => void;
};

export const createRuntimeStateManager = (): RuntimeStateManager => {
  let internalState$: Observable<DiscoverInternalState> | undefined;

  return {
    adHocDataViews$: new BehaviorSubject<DataView[]>([]),
    tabs: { byId: {} },
    get internalState$() {
      return internalState$;
    },
    setInternalState$: (internalState: InternalStateStore) => {
      internalState$ = from(internalState);
    },
  };
};

export type InitialUnifiedHistogramLayoutProps = Pick<
  UnifiedHistogramPartialLayoutProps,
  'topPanelHeight'
>;

type InitialUnifiedHistogramLayoutPropsMap = Record<
  string,
  InitialUnifiedHistogramLayoutProps | undefined
>;

export const createTabRuntimeState = ({
  profilesManager,
  ebtManager,
  initialValues,
  createUrlSyncObservablesFn,
}: {
  profilesManager: ProfilesManager;
  ebtManager: DiscoverEBTManager;
  initialValues?: {
    unifiedHistogramLayoutPropsMap?: InitialUnifiedHistogramLayoutPropsMap;
  };
  createUrlSyncObservablesFn: () => UrlSyncObservables;
}): ReactiveTabRuntimeState => {
  const scopedEbtManager = ebtManager.createScopedEBTManager();
  let unsubscribeFn: (() => void) | undefined;

  return {
    stateContainer$: new BehaviorSubject<DiscoverStateContainer | undefined>(undefined),
    customizationService$: new BehaviorSubject<ConnectedCustomizationService | undefined>(
      undefined
    ),
    unifiedHistogramConfig$: new BehaviorSubject<UnifiedHistogramConfig>({
      localStorageKeyPrefix: undefined,
      layoutPropsMap: initialValues?.unifiedHistogramLayoutPropsMap ?? {},
    }),
    scopedProfilesManager$: new BehaviorSubject(
      profilesManager.createScopedProfilesManager({ scopedEbtManager })
    ),
    scopedEbtManager$: new BehaviorSubject(scopedEbtManager),
    currentDataView$: new BehaviorSubject<DataView | undefined>(undefined),
    urlSyncObservables: createUrlSyncObservablesFn(),
    onSubscribe: ({ unsubscribeFn: fn }: { unsubscribeFn: () => void }) => {
      unsubscribeFn = fn;
    },
    unsubscribe: () => {
      unsubscribeFn?.();
      unsubscribeFn = undefined;
    },
  };
};

export const useRuntimeState = <T,>(stateSubject$: BehaviorSubject<T>) =>
  useObservable(stateSubject$, stateSubject$.getValue());

export const selectTabRuntimeState = (runtimeStateManager: RuntimeStateManager, tabId: string) =>
  runtimeStateManager.tabs.byId[tabId];

export const selectIsDataViewUsedInMultipleRuntimeTabStates = (
  runtimeStateManager: RuntimeStateManager,
  dataViewId: string
) =>
  Object.values(runtimeStateManager.tabs.byId).filter(
    (tab) => tab.currentDataView$.getValue()?.id === dataViewId
  ).length > 1;

export const selectTabRuntimeInternalState = (
  runtimeStateManager: RuntimeStateManager,
  tabId: string
): TabState['initialInternalState'] | undefined => {
  const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
  const stateContainer = tabRuntimeState?.stateContainer$.getValue();
  const savedSearch = stateContainer?.savedSearchState.getState();

  if (!stateContainer || !savedSearch) {
    return undefined;
  }

  const { dataRequestParams } = selectTab(stateContainer.internalState.getState(), tabId);

  return {
    serializedSearchSource: savedSearch.searchSource.getSerializedFields(),
    visContext: savedSearch.visContext,
    controlGroupJson: savedSearch.controlGroupJson,
    ...(dataRequestParams.isSearchSessionRestored
      ? { searchSessionId: dataRequestParams.searchSessionId }
      : {}),
  };
};

export const selectInitialUnifiedHistogramLayoutPropsMap = (
  runtimeStateManager: RuntimeStateManager,
  tabId: string
): InitialUnifiedHistogramLayoutPropsMap => {
  const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
  const layoutPropsMap = tabRuntimeState?.unifiedHistogramConfig$.getValue().layoutPropsMap ?? {};

  return Object.keys(layoutPropsMap).reduce<InitialUnifiedHistogramLayoutPropsMap>((acc, key) => {
    const topPanelHeight = layoutPropsMap[key]?.topPanelHeight;

    if (topPanelHeight !== undefined) {
      acc[key] = { topPanelHeight };
    }

    return acc;
  }, {});
};

export const useCurrentTabRuntimeState = <T,>(
  runtimeStateManager: RuntimeStateManager,
  selector: (tab: ReactiveTabRuntimeState) => BehaviorSubject<T>
) => {
  const { currentTabId } = useCurrentTabContext();
  return useRuntimeState(selector(selectTabRuntimeState(runtimeStateManager, currentTabId)));
};

export type CombinedRuntimeState = DiscoverRuntimeState & Pick<TabRuntimeState, 'currentDataView'>;

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
