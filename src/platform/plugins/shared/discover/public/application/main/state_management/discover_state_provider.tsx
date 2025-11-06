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

  return {
    Provider: context.Provider,
    useSavedSearch,
  };
}

export const { Provider: DiscoverStateProvider, useSavedSearch } = createStateHelpers();

export const DiscoverMainProvider = ({
  value,
  children,
}: React.PropsWithChildren<{
  value: DiscoverStateContainer;
}>) => {
  return (
    <DiscoverStateProvider value={value}>
      {/**
       * TODO: We should be able to remove this since it already wraps the whole application,
       * but doing so causes FTR flakiness in CI, so it needs to be investigated further.
       */}
      <InternalStateProvider store={value.internalState}>{children}</InternalStateProvider>
    </DiscoverStateProvider>
  );
};
