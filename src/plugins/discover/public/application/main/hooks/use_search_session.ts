/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useEffect } from 'react';
import { noSearchSessionStorageCapabilityMessage } from '@kbn/data-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import {
  DiscoverStateContainer,
} from '../services/discover_state';
import { DiscoverServices } from '../../../build_services';
import {
    createSearchSessionRestorationDataProvider
} from "@kbn/discover-plugin/public/application/main/services/discover_state_utils";

export function useSearchSession({
  services,
  stateContainer,
  savedSearch,
}: {
  services: DiscoverServices;
  stateContainer: DiscoverStateContainer;
  savedSearch: SavedSearch;
}) {
  const { data, capabilities } = services;

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
}
