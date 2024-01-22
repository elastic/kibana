/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createContext, useContext } from 'react';
import { useFlyoutMemoryState } from './context/memory_state_provider';
import { useFlyoutUrlState } from './context/url_state_provider';
import { type ExpandableFlyoutApi } from './types';

export type { ExpandableFlyoutApi as ExpandableFlyoutContextValue };

type ExpandableFlyoutContextValue = 'memory' | 'url';

export const ExpandableFlyoutContext = createContext<ExpandableFlyoutContextValue | undefined>(
  undefined
);

/**
 * Retrieve Flyout's api and state
 * @deprecated
 */
export const useExpandableFlyoutContext = (): ExpandableFlyoutApi => {
  const contextValue = useContext(ExpandableFlyoutContext);

  if (!contextValue) {
    throw new Error(
      'ExpandableFlyoutContext can only be used within ExpandableFlyoutContext provider'
    );
  }

  const memoryState = useFlyoutMemoryState();
  const urlState = useFlyoutUrlState();

  return contextValue === 'memory' ? memoryState : urlState;
};

/**
 * This hook allows you to interact with the flyout, open panels and previews etc.
 */
export const useExpandableFlyoutApi = () => {
  const { panels, ...api } = useExpandableFlyoutContext();

  return api;
};

/**
 * This hook allows you to access the flyout state, read open panels and previews.
 */
export const useExpandableFlyoutState = () => {
  const expandableFlyoutApiAndState = useExpandableFlyoutContext();

  return expandableFlyoutApiAndState.panels;
};
