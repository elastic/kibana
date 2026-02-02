/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { ISearchSource } from '@kbn/data-plugin/common';
import type { DiscoverServices } from '../../..';
import type { DiscoverDataStateContainer } from './discover_data_state_container';
import { getDataStateContainer } from './discover_data_state_container';
import type { DiscoverSearchSessionManager } from './discover_search_session';
import type { DiscoverCustomizationContext } from '../../../customizations';
import type { InternalStateStore, RuntimeStateManager, TabActionInjector, TabState } from './redux';
import { selectTabRuntimeState } from './redux';
import { createTabActionInjector, internalStateActions, selectTab } from './redux';
import type { SearchSourceChangeType } from './redux/types';

export interface DiscoverStateContainerParams {
  /**
   * The ID of the tab associated with this state container
   */
  tabId: string;
  /**
   * The current savedSearch
   */
  savedSearch?: string | SavedSearch;
  /**
   * core ui settings service
   */
  services: DiscoverServices;
  /**
   * Context object for customization related properties
   */
  customizationContext: DiscoverCustomizationContext;
  /**
   * URL state storage
   */
  stateStorageContainer: IKbnUrlStateStorage;
  /**
   * Internal shared state that's used at several places in the UI
   */
  internalState: InternalStateStore;
  /**
   * State manager for runtime state that can't be stored in Redux
   */
  runtimeStateManager: RuntimeStateManager;
  /**
   * Manages search sessions and search session URL state
   */
  searchSessionManager: DiscoverSearchSessionManager;
}

export interface DiscoverStateContainer {
  /**
   * Data fetching related state
   **/
  dataState: DiscoverDataStateContainer;
  /**
   * Internal shared state that's used at several places in the UI
   */
  internalState: InternalStateStore;
  /**
   * @deprecated Do not use, this only exists to support
   * Timeline which accesses the internal state directly
   */
  internalStateActions: typeof internalStateActions;
  /**
   * Injects the current tab into a given internalState action
   */
  injectCurrentTab: TabActionInjector;
  /**
   * Gets the state of the current tab
   */
  getCurrentTab: () => TabState;
  /**
   * Gets the searchSource of the current tab
   */
  getSearchSource: () => ISearchSource;
  /**
   * Gets observable for search source updates of the current tab
   */
  getSearchSourceUpdates$: () => Observable<
    | {
        changeType: SearchSourceChangeType;
        value: ISearchSource;
      }
    | undefined
  >;
  /**
   * State manager for runtime state that can't be stored in Redux
   */
  runtimeStateManager: RuntimeStateManager;
  /**
   * State of url, allows updating and subscribing to url changes
   */
  stateStorage: IKbnUrlStateStorage;
  /**
   * Service for handling search sessions
   */
  searchSessionManager: DiscoverSearchSessionManager;
  /**
   * Context object for customization related properties
   */
  customizationContext: DiscoverCustomizationContext;
}

/**
 * Builds and returns appState and globalState containers and helper functions
 * Used to sync URL with UI state
 */
export function getDiscoverStateContainer({
  tabId,
  services,
  customizationContext,
  stateStorageContainer: stateStorage,
  internalState,
  runtimeStateManager,
  searchSessionManager,
}: DiscoverStateContainerParams): DiscoverStateContainer {
  const injectCurrentTab = createTabActionInjector(tabId);
  const getCurrentTab = () => selectTab(internalState.getState(), tabId);
  const getSearchSource = (): ISearchSource => {
    const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
    return (
      tabRuntimeState.searchSourceState$.getValue()?.value ??
      services.data.search.searchSource.createEmpty()
    );
  };
  const getSearchSourceUpdates$ = () => {
    const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
    return tabRuntimeState.searchSourceState$;
  };

  const dataStateContainer = getDataStateContainer({
    services,
    searchSessionManager,
    internalState,
    runtimeStateManager,
    injectCurrentTab,
    getCurrentTab,
  });

  return {
    internalState,
    internalStateActions,
    injectCurrentTab,
    getCurrentTab,
    getSearchSource,
    getSearchSourceUpdates$,
    runtimeStateManager,
    dataState: dataStateContainer,
    stateStorage,
    searchSessionManager,
    customizationContext,
  };
}
