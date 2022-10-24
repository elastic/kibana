/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { DiscoverStateContainer, DiscoverStateProvider } from './discover_state';
import { DiscoverAppStateProvider } from './discover_app_state_container';
import { InternalStateProvider } from './discover_internal_state_container';

export const DiscoverMainProvider = ({
  value,
  children,
}: {
  value: DiscoverStateContainer;
  children: React.ReactElement;
}) => {
  return (
    <DiscoverStateProvider value={value}>
      <DiscoverAppStateProvider value={value.appState}>
        <InternalStateProvider value={value.internalState}>{children}</InternalStateProvider>
      </DiscoverAppStateProvider>
    </DiscoverStateProvider>
  );
};
