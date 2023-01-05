/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo, useEffect } from 'react';
import { History } from 'history';
import { noSearchSessionStorageCapabilityMessage } from '@kbn/data-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { DiscoverSearchSessionManager } from '../services/discover_search_session';
import {
  createSearchSessionRestorationDataProvider,
  DiscoverStateContainer,
} from '../services/discover_state';
import { DiscoverServices } from '../../../build_services';

export function useSearchSession({
  services,
  history,
  stateContainer,
  savedSearch,
}: {
  services: DiscoverServices;
  stateContainer: DiscoverStateContainer;
  history: History;
  savedSearch: SavedSearch;
}) {
  const { data, capabilities } = services;
  /**
   * Search session logic
   */
  const searchSessionManager = useMemo(
    () =>
      new DiscoverSearchSessionManager({
        history,
        session: data.search.session,
      }),
    [data.search.session, history]
  );

  useEffect(() => {
    data.search.session.enableStorage(
      createSearchSessionRestorationDataProvider({
        appStateContainer: stateContainer.appState,
        data,
        getSavedSearch: () => savedSearch,
      }),
      {
        isDisabled: () =>
          capabilities.discover.storeSearchSession
            ? { disabled: false }
            : {
                disabled: true,
                reasonText: noSearchSessionStorageCapabilityMessage,
              },
      }
    );
  }, [capabilities.discover.storeSearchSession, data, savedSearch, stateContainer.appState]);

  return searchSessionManager;
}
