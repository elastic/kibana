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
import type { ChromeUiStore, ChromeUiState } from './chrome_ui_store';

// Create the context
const ChromeUiStoreContext = createContext<ChromeUiStore | undefined>(undefined);

interface ChromeUiStoreProviderProps {
  children: ReactNode;
  store: ChromeUiStore;
}

// Provider component
export const ChromeUiStoreProvider: React.FC<ChromeUiStoreProviderProps> = ({
  children,
  store,
}) => {
  return <ChromeUiStoreContext.Provider value={store}>{children}</ChromeUiStoreContext.Provider>;
};

// Hook to use the store
export function useChromeUiStore(): ChromeUiStore {
  const context = useContext(ChromeUiStoreContext);
  if (!context) {
    throw new Error('useChromeUiStore must be used within a ChromeUiStoreProvider');
  }
  return context;
}

export function useChromeUiState<U>(selector: (state: ChromeUiState) => U): U {
  const store = useChromeUiStore();
  return useStore(store, selector);
}
