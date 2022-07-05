/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useEffect, useMemo, useState } from 'react';

import { cloneDeep } from 'lodash';
import { CONTEXT_DEFAULT_SIZE_SETTING } from '../../../../common';
import { DiscoverServices } from '../../../build_services';
import { AppState, getState, GlobalState } from '../services/context_state';

export function useContextAppState({ services }: { services: DiscoverServices }) {
  const { uiSettings: config, history, core, filterManager } = services;

  const stateContainer = useMemo(() => {
    return getState({
      defaultSize: parseInt(config.get(CONTEXT_DEFAULT_SIZE_SETTING), 10),
      storeInSessionStorage: config.get('state:storeInSessionStorage'),
      history: history(),
      toasts: core.notifications.toasts,
      uiSettings: config,
    });
  }, [config, history, core.notifications.toasts]);

  const [appState, setAppState] = useState<AppState>(stateContainer.appState.getState());
  const [globalState, setGlobalState] = useState<GlobalState>(
    stateContainer.globalState.getState()
  );

  /**
   * Sync with app state container
   */
  useEffect(() => {
    stateContainer.startSync();

    return () => stateContainer.stopSync();
  }, [stateContainer]);

  useEffect(() => {
    const unsubscribeAppState = stateContainer.appState.subscribe((newState) => {
      setAppState((prevState) => ({ ...prevState, ...newState }));
      filterManager.setFilters(cloneDeep(newState.filters));
    });

    const unsubscribeGlobalState = stateContainer.globalState.subscribe((newState) => {
      setGlobalState((prevState) => ({ ...prevState, ...newState }));
      filterManager.setFilters(cloneDeep(newState.filters));
    });

    return () => {
      unsubscribeAppState();
      unsubscribeGlobalState();
    };
  }, [stateContainer, setAppState, filterManager]);

  /**
   * Take care of filters
   */
  useEffect(() => {
    filterManager.setFilters(cloneDeep(stateContainer.getFilters()));

    const { setFilters } = stateContainer;
    const filterObservable = filterManager.getUpdates$().subscribe(() => {
      setFilters(filterManager);
    });

    return () => filterObservable.unsubscribe();
  }, [filterManager, stateContainer]);

  return {
    appState,
    globalState,
    stateContainer,
    setAppState: stateContainer.setAppState,
  };
}
