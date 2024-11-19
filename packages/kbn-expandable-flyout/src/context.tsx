/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, memo, useContext, useMemo } from 'react';

export interface ExpandableFlyoutContext {
  /**
   * Unique key to be used as url parameter to store the state of the flyout
   */
  urlKey: string | undefined;
}

export const ExpandableFlyoutContext = createContext<ExpandableFlyoutContext | undefined>(
  undefined
);

export interface ExpandableFlyoutContextProviderProps {
  /**
   * Unique key to be used as url parameter to store the state of the flyout
   */
  urlKey: string | undefined;
  /**
   * React components to render
   */
  children: React.ReactNode;
}

/**
 * Context used to share the value of the urlKey to the rest of the expandable flyout's code
 */
export const ExpandableFlyoutContextProvider = memo<ExpandableFlyoutContextProviderProps>(
  ({ urlKey, children }) => {
    const contextValue = useMemo(
      () => ({
        urlKey,
      }),
      [urlKey]
    );

    return (
      <ExpandableFlyoutContext.Provider value={contextValue}>
        {children}
      </ExpandableFlyoutContext.Provider>
    );
  }
);

ExpandableFlyoutContextProvider.displayName = 'ExpandableFlyoutContextProvider';

export const useExpandableFlyoutContext = () => {
  const context = useContext(ExpandableFlyoutContext);
  if (context === undefined) {
    throw new Error(
      'ExpandableFlyoutContext can only be used within ExpandableFlyoutContext provider'
    );
  }
  return context;
};
