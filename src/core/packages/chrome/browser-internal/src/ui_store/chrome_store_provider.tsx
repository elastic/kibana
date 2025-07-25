/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, ReactNode, useContext } from 'react';
import { useStore } from 'zustand';
import type { ChromeState, ChromeStore } from './chrome_store';

// Create the context
const ChromeUiStoreContext = createContext<ChromeStore | undefined>(undefined);

interface ChromeStoreProviderProps {
  children: ReactNode;
  store: ChromeStore;
}

// Provider component
export const ChromeUiStoreProvider: React.FC<ChromeStoreProviderProps> = ({ children, store }) => {
  return <ChromeUiStoreContext.Provider value={store}>{children}</ChromeUiStoreContext.Provider>;
};

// Hook to use the store
export function useChromeStore(): ChromeStore {
  const context = useContext(ChromeUiStoreContext);
  if (!context) {
    throw new Error('useChromeStore must be used within a ChromeStoreProvider');
  }
  return context;
}

export function useChromeState<U>(selector: (state: ChromeState) => U): U {
  const store = useChromeStore();
  return useStore(store, selector);
}
