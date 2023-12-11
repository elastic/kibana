/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createContext, useContext } from 'react';
import { type ExpandableFlyoutContextValue } from './types';

export type { ExpandableFlyoutContextValue };

export const ExpandableFlyoutContext = createContext<ExpandableFlyoutContextValue | undefined>(
  undefined
);

/**
 * Retrieve context's properties
 */
export const useExpandableFlyoutContext = (): ExpandableFlyoutContextValue => {
  const contextValue = useContext(ExpandableFlyoutContext);

  if (!contextValue) {
    throw new Error(
      'ExpandableFlyoutContext can only be used within ExpandableFlyoutContext provider'
    );
  }

  return contextValue;
};
