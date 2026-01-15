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
import type { ScopedProfilesManager } from '../../../../context_awareness';
import type { TabState } from './types';
import type { ScopedDiscoverEBTManager } from '../../../../ebt_manager';
import { selectTab } from './selectors';
import type { CascadedDocumentsStateManager } from '../../data_fetching/cascaded_documents_fetcher';
import { CascadedDocumentsFetcher } from '../../data_fetching/cascaded_documents_fetcher';
import type { DiscoverServices } from '../../../../build_services';

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
  cascadedDocumentsFetcher: CascadedDocumentsFetcher;
  currentDataView: DataView;
  unsubscribeFn: (() => void) | undefined;
}

type ReactiveRuntimeState<TState, TNullable extends keyof TState = never> = {
  [key in keyof TState & string as `${key}$`]: BehaviorSubject<
    key extends TNullable ? TState[key] | undefined : TState[key]
  >;
};

export type ReactiveTabRuntimeState = ReactiveRuntimeState<TabRuntimeState, 'currentDataView'>;

export type RuntimeStateManager = ReactiveRuntimeState<DiscoverRuntimeState> & {
  tabs: { byId: Record<string, ReactiveTabRuntimeState> };
};

export const createRuntimeStateManager = (): RuntimeStateManager => {
  return {
    adHocDataViews$: new BehaviorSubject<DataView[]>([]),
    tabs: { byId: {} },
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
  services,
  cascadedDocumentsStateManager,
  initialValues,
}: {
  services: DiscoverServices;
  cascadedDocumentsStateManager: CascadedDocumentsStateManager;
  initialValues?: {
    unifiedHistogramLayoutPropsMap?: InitialUnifiedHistogramLayoutPropsMap;
  };
}): ReactiveTabRuntimeState => {
  const scopedEbtManager = services.ebtManager.createScopedEBTManager();
  const scopedProfilesManager: ScopedProfilesManager =
    services.profilesManager.createScopedProfilesManager({ scopedEbtManager });
  const cascadedDocumentsFetcher = new CascadedDocumentsFetcher(
    services,
    scopedProfilesManager,
    cascadedDocumentsStateManager
  );

  return {
    stateContainer$: new BehaviorSubject<DiscoverStateContainer | undefined>(undefined),
    customizationService$: new BehaviorSubject<ConnectedCustomizationService | undefined>(
      undefined
    ),
    unifiedHistogramConfig$: new BehaviorSubject<UnifiedHistogramConfig>({
      localStorageKeyPrefix: undefined,
      layoutPropsMap: initialValues?.unifiedHistogramLayoutPropsMap ?? {},
    }),
    scopedProfilesManager$: new BehaviorSubject(scopedProfilesManager),
    scopedEbtManager$: new BehaviorSubject(scopedEbtManager),
    cascadedDocumentsFetcher$: new BehaviorSubject(cascadedDocumentsFetcher),
    currentDataView$: new BehaviorSubject<DataView | undefined>(undefined),
    unsubscribeFn$: new BehaviorSubject<TabRuntimeState['unsubscribeFn']>(undefined),
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
