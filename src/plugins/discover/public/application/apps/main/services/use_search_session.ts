/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { History } from 'history';
import { useEffect, useMemo } from 'react';
import { noSearchSessionStorageCapabilityMessage } from '../../../../../../data/public/search/session/i18n';
import type { DiscoverServices } from '../../../../build_services';
import type { SavedSearch } from '../../../../saved_searches/types';
import { DiscoverSearchSessionManager } from './discover_search_session';
import type { GetStateReturn } from './discover_state';
import { createSearchSessionRestorationDataProvider } from './discover_state';

export function useSearchSession({
  services,
  history,
  stateContainer,
  savedSearch,
}: {
  services: DiscoverServices;
  stateContainer: GetStateReturn;
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
        appStateContainer: stateContainer.appStateContainer,
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
  }, [
    capabilities.discover.storeSearchSession,
    data,
    savedSearch,
    stateContainer.appStateContainer,
  ]);

  return searchSessionManager;
}
