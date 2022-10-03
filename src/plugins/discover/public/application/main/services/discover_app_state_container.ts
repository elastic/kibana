/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createStateContainer,
  createStateContainerReactHelpers,
  IKbnUrlStateStorage,
  INullableBaseStateContainer,
  ReduxLikeStateContainer,
  syncState,
} from '@kbn/kibana-utils-plugin/public';
import { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { IStateStorage } from '@kbn/kibana-utils-plugin/public/state_sync';
import { DiscoverGridSettings } from '../../../components/discover_grid/types';
import { cleanupUrlState } from '../utils/cleanup_url_state';
import { getStateDefaults } from '../utils/get_state_defaults';
import { handleSourceColumnState } from '../../../utils/state_helpers';
import { AppStateUrl } from './discover_state';
import { DiscoverServices } from '../../../build_services';
import { VIEW_MODE } from '../../../components/view_mode_toggle';

export const APP_STATE_URL_KEY = '_a';
interface SyncStateArgs {
  storageKey: string;
  stateContainer: INullableBaseStateContainer<AppState>;
  stateStorage: IStateStorage;
}
export interface AppStateContainer extends ReduxLikeStateContainer<AppState> {
  getPrevious: () => AppState;
  syncState: (params: SyncStateArgs) => void;
}

export const { Provider: AppStateProvider, useSelector: useAppStateSelector } =
  createStateContainerReactHelpers<ReduxLikeStateContainer<AppState>>();

export interface AppState {
  /**
   * Columns displayed in the table
   */
  columns?: string[];
  /**
   * Array of applied filters
   */
  filters?: Filter[];
  /**
   * Data Grid related state
   */
  grid?: DiscoverGridSettings;
  /**
   * Hide chart
   */
  hideChart?: boolean;
  /**
   * id of the used data view
   */
  index?: string;
  /**
   * Used interval of the histogram
   */
  interval?: string;
  /**
   * Lucence or KQL query
   */
  query?: Query | AggregateQuery;
  /**
   * Array of the used sorting [[field,direction],...]
   */
  sort?: string[][];
  /**
   * id of the used saved query
   */
  savedQuery?: string;
  /**
   * Table view: Documents vs Field Statistics
   */
  viewMode?: VIEW_MODE;
  /**
   * Hide mini distribution/preview charts when in Field Statistics mode
   */
  hideAggregatedPreview?: boolean;
  /**
   * Document explorer row height option
   */
  rowHeight?: number;
  /**
   * Number of rows in the grid per page
   */
  rowsPerPage?: number;
}

export const getEnhancedAppStateContainer = (
  stateStorage: IKbnUrlStateStorage,
  savedSearch: SavedSearch,
  services: DiscoverServices
) => {
  let previousAppState: AppState = {};
  const appStateContainer = createStateContainer<AppState>(
    getInitialState(stateStorage, savedSearch, services)
  );

  const enhancedAppState = {
    ...appStateContainer,
    set: (value: AppState | null) => {
      if (value) {
        previousAppState = appStateContainer.getState();
        appStateContainer.set(value);
      }
    },
    getPrevious: () => {
      return previousAppState;
    },
  };

  return {
    ...enhancedAppState,
    syncState: () =>
      syncState({
        storageKey: APP_STATE_URL_KEY,
        stateContainer: enhancedAppState,
        stateStorage,
      }),
  };
};

function getInitialState(
  stateStorage: IKbnUrlStateStorage,
  savedSearch: SavedSearch,
  services: DiscoverServices
) {
  const appStateFromUrl = cleanupUrlState(stateStorage.get(APP_STATE_URL_KEY) as AppStateUrl);

  const defaultAppState = getStateDefaults({
    savedSearch,
    services,
  });
  const initialAppState = handleSourceColumnState(
    savedSearch.id
      ? { ...defaultAppState }
      : {
          ...defaultAppState,
          ...appStateFromUrl,
        },
    services.uiSettings
  );
  return initialAppState;
}
