/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useState, useEffect } from 'react';
import { isEqual } from 'lodash';
import { AppState } from '../services/discover_app_state_container';
import { DiscoverStateContainer } from '../services/discover_state';

export function useStateContainer(stateContainer: DiscoverStateContainer, filterProps?: string[]) {
  const [state, setState] = useState<AppState>(stateContainer.appState.getState());

  useEffect(() => {
    const unsubscribe = stateContainer.appState.subscribe((next) => {
      const nextState = getFilteredProps(next, filterProps);
      if (!isEqual(state, nextState)) {
        // @ts-expect-error
        if (window.ELASTIC_DISCOVER_LOGGER) {
          // eslint-disable-next-line no-console
          console.log('useStateContainer hook update', nextState);
        }
        setState(nextState);
      }
    });
    return () => unsubscribe();
  }, [stateContainer, filterProps, state]);
  return state;
}

export function getFilteredProps(state: AppState, filterProps?: string[]) {
  if (!filterProps?.length) {
    return state;
  }
  const result = {} as AppState;
  for (const [key, value] of Object.entries(state)) {
    if (filterProps.includes(key)) {
      // @ts-expect-error
      result[key] = value;
    }
  }
  return result;
}
