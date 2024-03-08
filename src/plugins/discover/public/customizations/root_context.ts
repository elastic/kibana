/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createContext, useContext } from 'react';
import type { DeepPartial } from 'utility-types';

export type DiscoverDisplayMode = 'embedded' | 'standalone';

export interface DiscoverRootContext {
  /*
   * Display mode in which discover is running
   */
  displayMode: DiscoverDisplayMode;
  /**
   * Inline top nav configuration
   */
  inlineTopNav: {
    /**
     * Whether or not to show the inline top nav
     */
    enabled: boolean;
    /**
     * Whether or not to show the Logs Explorer tabs
     */
    showLogsExplorerTabs: boolean;
  };
}

export const createDiscoverRootContext = (
  rootContext: DeepPartial<DiscoverRootContext> = {}
): Readonly<DiscoverRootContext> => {
  return {
    displayMode: rootContext.displayMode ?? 'standalone',
    inlineTopNav: {
      enabled: rootContext.inlineTopNav?.enabled ?? false,
      showLogsExplorerTabs: rootContext.inlineTopNav?.showLogsExplorerTabs ?? false,
    },
  };
};

const rootContext = createContext(createDiscoverRootContext());

export const DiscoverRootContextProvider = rootContext.Provider;

export const useDiscoverRootContext = () => useContext(rootContext);
