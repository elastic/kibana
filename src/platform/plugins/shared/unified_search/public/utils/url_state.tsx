/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { distinctUntilChanged } from 'rxjs';

const UNIFIED_SEARCH_URL_STATE = '_us';

const UrlStateContext = React.createContext<IKbnUrlStateStorage | undefined>(undefined);

/**
 * Helper functions to store Unified Search UI state in the URL. These states should be used exclusively
 * for UI states that only matter internally to the Unified Search UI, and do not apply to whatever
 * application is embedding it.
 */

export const withUrlState = <T extends {} = {}>(Component: React.ComponentType<T>) => {
  const Render = (props: T) => {
    const kibanaUrlStorage = useMemo(() => createKbnUrlStateStorage(), []);

    return (
      <UrlStateContext.Provider value={kibanaUrlStorage}>
        <Component {...props} />
      </UrlStateContext.Provider>
    );
  };

  return Render;
};

export const useUrlState: <T>(key: string, initialState: T) => [T, (next: T) => void] = (
  key,
  defaultState
) => {
  const kibanaUrlStorage = useContext(UrlStateContext);
  if (!kibanaUrlStorage)
    throw new Error('useUrlState hook used outside of a UrlStateContext.Provider');
  const [state, setState] = useState(
    kibanaUrlStorage.get<{ [key]: typeof defaultState }>(UNIFIED_SEARCH_URL_STATE)?.[key] ??
      defaultState
  );

  useEffect(() => {
    const urlStateSubscription = kibanaUrlStorage
      .change$<{ [key]: typeof defaultState }>(UNIFIED_SEARCH_URL_STATE)
      .pipe(distinctUntilChanged((prevState, nextState) => prevState?.[key] === nextState?.[key]))
      .subscribe((nextState) => {
        // If state is unset, default to defaultState
        setState(nextState?.[key] ?? defaultState);
      });
    return urlStateSubscription.unsubscribe;
  }, [defaultState, key, kibanaUrlStorage]);

  const updateState = (next: typeof defaultState) => {
    kibanaUrlStorage.set<{ [key]: typeof defaultState }>(UNIFIED_SEARCH_URL_STATE, {
      ...(kibanaUrlStorage.get(UNIFIED_SEARCH_URL_STATE) ?? {}),
      [key]: next,
    });
  };

  return [state, updateState];
};
