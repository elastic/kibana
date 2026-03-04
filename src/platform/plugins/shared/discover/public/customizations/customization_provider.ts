/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { isFunction } from 'lodash';
import { from } from 'rxjs';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type {
  CustomizationCallback,
  DiscoverCustomizationContext,
  ExtendedDiscoverStateContainer,
} from './types';
import type {
  InternalStateStore,
  RuntimeStateManager,
  TabActionInjector,
  TabState,
} from '../application/main/state_management/redux';

import type {
  DiscoverCustomizationId,
  DiscoverCustomizationService,
} from './customization_service';
import { createCustomizationService } from './customization_service';
import { getInitialAppState } from '../application/main/state_management/utils/get_initial_app_state';
import { createTabAppStateObservable } from '../application/main/state_management/utils/create_tab_app_state_observable';
import { createTabPersistableStateObservable } from '../application/main/state_management/utils/create_tab_persistable_state_observable';
import type { DiscoverServices } from '../build_services';
import {
  fromSavedSearchToSavedObjectTab,
  internalStateActions,
  selectTabSavedSearch,
} from '../application/main/state_management/redux';
import { defaultCustomizationContext } from './defaults';

const customizationContext = createContext(createCustomizationService());

const discoverCustomizationContextContext = createContext<DiscoverCustomizationContext>(
  defaultCustomizationContext
);

export const DiscoverCustomizationContextProvider = discoverCustomizationContextContext.Provider;

export const useDiscoverCustomizationContext = () =>
  useContext(discoverCustomizationContextContext);

export const DiscoverCustomizationProvider = customizationContext.Provider;

export const useDiscoverCustomization$ = <TCustomizationId extends DiscoverCustomizationId>(
  id: TCustomizationId
) => useContext(customizationContext).get$(id);

export const useDiscoverCustomization = <TCustomizationId extends DiscoverCustomizationId>(
  id: TCustomizationId
) => {
  const customizationService = useContext(customizationContext);
  return useObservable(customizationService.get$(id), customizationService.get(id));
};

export interface ConnectedCustomizationService extends DiscoverCustomizationService {
  stateContainer: ExtendedDiscoverStateContainer;
  cleanup: () => Promise<void>;
}

export const getExtendedDiscoverStateContainer = ({
  internalState,
  injectCurrentTab,
  getCurrentTab,
  runtimeStateManager,
  stateStorage,
  services,
}: {
  internalState: InternalStateStore;
  injectCurrentTab: TabActionInjector;
  getCurrentTab: () => TabState;
  runtimeStateManager: RuntimeStateManager;
  stateStorage: IKbnUrlStateStorage;
  services: DiscoverServices;
}): ExtendedDiscoverStateContainer => ({
  internalState,
  injectCurrentTab,
  getCurrentTab,
  stateStorage,
  createAppStateObservable: () =>
    createTabAppStateObservable({
      tabId: getCurrentTab().id,
      internalState$: from(internalState),
      getState: internalState.getState,
    }),
  createTabPersistableStateObservable: () =>
    createTabPersistableStateObservable({
      tabId: getCurrentTab().id,
      internalState$: from(internalState),
      getState: internalState.getState,
    }),
  getAppStateFromSavedSearch: (newSavedSearch: SavedSearch) => {
    return getInitialAppState({
      initialUrlState: undefined,
      persistedTab: fromSavedSearchToSavedObjectTab({
        tab: getCurrentTab(),
        savedSearch: newSavedSearch,
        services,
      }),
      dataView: newSavedSearch.searchSource.getField('index'),
      services,
    });
  },
  getSavedSearchFromCurrentTab: async () => {
    return await selectTabSavedSearch({
      tabId: getCurrentTab().id,
      getState: internalState.getState,
      runtimeStateManager,
      services,
    });
  },
  internalActions: {
    setAppState: internalStateActions.setAppState,
    updateGlobalState: internalStateActions.updateGlobalState,
    updateAppStateAndReplaceUrl: internalStateActions.updateAppStateAndReplaceUrl,
    resetAppState: internalStateActions.resetAppState,
    initializeAndSync: internalStateActions.initializeAndSync,
    stopSyncing: internalStateActions.stopSyncing,
  },
});

export const getConnectedCustomizationService = async ({
  customizationCallbacks,
  internalState,
  injectCurrentTab,
  getCurrentTab,
  runtimeStateManager,
  stateStorage,
  services,
}: {
  customizationCallbacks: CustomizationCallback[];
  internalState: InternalStateStore;
  injectCurrentTab: TabActionInjector;
  getCurrentTab: () => TabState;
  runtimeStateManager: RuntimeStateManager;
  stateStorage: IKbnUrlStateStorage;
  services: DiscoverServices;
}): Promise<ConnectedCustomizationService> => {
  const customizations = createCustomizationService();
  const stateContainer = getExtendedDiscoverStateContainer({
    internalState,
    injectCurrentTab,
    getCurrentTab,
    runtimeStateManager,
    stateStorage,
    services,
  });
  const callbacks = customizationCallbacks.map((callback) =>
    Promise.resolve(callback({ customizations, stateContainer }))
  );
  const initialize = () => Promise.all(callbacks).then((result) => result.filter(isFunction));

  // TODO: Race condition?
  await initialize();

  return {
    ...customizations,
    stateContainer,
    cleanup: async () => {
      const cleanups = await initialize();
      cleanups.forEach((cleanup) => cleanup());
    },
  };
};
