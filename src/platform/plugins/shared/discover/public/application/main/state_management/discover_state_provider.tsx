/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { DiscoverAppStateProvider } from './discover_app_state_container';
import type { DiscoverStateContainer } from './discover_state';
import { InternalStateProvider } from './redux';

function createStateHelpers() {
  const context = React.createContext<DiscoverStateContainer | null>(null);
  const useContainer = () => useContext(context);
  const useSavedSearch = () => {
    const container = useContainer();
    return useObservable<SavedSearch>(
      container!.savedSearchState.getCurrent$(),
      container!.savedSearchState.getCurrent$().getValue()
    );
  };
  const useSavedSearchInitial = () => {
    const container = useContainer();
    return useObservable<SavedSearch>(
      container!.savedSearchState.getInitial$(),
      container!.savedSearchState.getInitial$().getValue()
    );
  };
  const useSavedSearchHasChanged = () => {
    const container = useContainer();
    return useObservable<boolean>(
      container!.savedSearchState.getHasChanged$(),
      container!.savedSearchState.getHasChanged$().getValue()
    );
  };

  return {
    Provider: context.Provider,
    useSavedSearch,
    useSavedSearchInitial,
    useSavedSearchHasChanged,
  };
}

export const {
  Provider: DiscoverStateProvider,
  useSavedSearchInitial,
  useSavedSearch,
  useSavedSearchHasChanged,
} = createStateHelpers();

export const DiscoverMainProvider = ({
  value,
  children,
}: React.PropsWithChildren<{
  value: DiscoverStateContainer;
}>) => {
  return (
    <DiscoverStateProvider value={value}>
      <DiscoverAppStateProvider value={value.appState}>
        {/**
         * TODO: We should be able to remove this since it already wraps the whole application,
         * but doing so causes FTR flakiness in CI, so it needs to be investigated further.
         */}
        <InternalStateProvider store={value.internalState}>{children}</InternalStateProvider>
      </DiscoverAppStateProvider>
    </DiscoverStateProvider>
  );
};
