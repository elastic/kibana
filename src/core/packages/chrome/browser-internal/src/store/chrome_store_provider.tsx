/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, ReactNode } from 'react';
import type { ChromeStore } from './chrome_store';

// Create the context
export const ChromeStoreContext = createContext<ChromeStore | undefined>(undefined);

interface ChromeStoreProviderProps {
  children: ReactNode;
  store: ChromeStore;
}

// Provider component
export const ChromeStoreProvider: React.FC<ChromeStoreProviderProps> = ({ children, store }) => {
  return <ChromeStoreContext.Provider value={store}>{children}</ChromeStoreContext.Provider>;
};
