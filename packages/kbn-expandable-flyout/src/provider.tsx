/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, PropsWithChildren } from 'react';
import { UrlStateProvider } from './context/url_state_provider';
import { MemoryStateProvider } from './context/memory_state_provider';

interface ExpandableFlyoutProviderProps {
  /**
   * This allows the user to choose how the flyout storage is handled.
   * Url storage syncs current values straight to the browser query string.
   */
  storage?: 'url' | 'memory';
}

/**
 * Wrap your plugin with this context for the ExpandableFlyout React component.
 * Storage property allows you to specify how the flyout state works internally.
 * With "url", it will be persisted into url and thus allow for deep linking & will survive webpage reloads.
 * "memory" is based on useReducer hook. The state is saved internally to the package. which means it will not be
 * persisted when sharing url or reloading browser pages.
 */
export const ExpandableFlyoutProvider: FC<PropsWithChildren<ExpandableFlyoutProviderProps>> = ({
  children,
  storage = 'url',
}) => {
  if (storage === 'memory') {
    return <MemoryStateProvider>{children}</MemoryStateProvider>;
  }

  return <UrlStateProvider>{children}</UrlStateProvider>;
};
