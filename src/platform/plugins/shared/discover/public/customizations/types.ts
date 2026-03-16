/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { DiscoverStateContainer } from '../application/main/state_management/discover_state';
import type { DiscoverCustomizationService } from './customization_service';
import type {
  DiscoverAppState,
  internalStateActions,
  TabState,
} from '../application/main/state_management/redux';

export interface ExtendedDiscoverStateContainer extends DiscoverStateContainer {
  /**
   * Creates an observable of the current tab's app state
   */
  createAppStateObservable: () => Observable<DiscoverAppState>;

  /**
   * Creates an observable of the current tab's main state (query, filters, time range, refresh interval, persistable attributes)
   */
  createTabPersistableStateObservable: () => Observable<
    Pick<TabState, 'appState' | 'globalState' | 'attributes'>
  >;

  /**
   * Get updated AppState when given a saved search
   */
  getAppStateFromSavedSearch: (newSavedSearch: SavedSearch) => DiscoverAppState;

  /**
   * Builds a SavedSearch object from the current tab's state
   */
  getSavedSearchFromCurrentTab: () => Promise<SavedSearch>;

  /**
   * A selection of prodived Redux actions from the internal state
   */
  internalActions: {
    fetchData: typeof internalStateActions.fetchData;
    openDiscoverSession: typeof internalStateActions.openDiscoverSession;
  };
}

export interface CustomizationCallbackContext {
  customizations: DiscoverCustomizationService;
  stateContainer: ExtendedDiscoverStateContainer;
}

export type CustomizationCallback = (
  options: CustomizationCallbackContext
) => void | (() => void) | Promise<void | (() => void)>;

export type DiscoverDisplayMode = 'embedded' | 'standalone';

export interface DiscoverCustomizationContext {
  /*
   * Display mode in which discover is running
   */
  displayMode: DiscoverDisplayMode;
}
