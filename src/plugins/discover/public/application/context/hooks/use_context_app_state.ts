/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DataView } from '@kbn/data-views-plugin/common';
import { useEffect, useMemo, useState } from 'react';

import { CONTEXT_DEFAULT_SIZE_SETTING } from '@kbn/discover-utils';
import { DiscoverServices } from '../../../build_services';
import { AppState, getState, GlobalState } from '../services/context_state';

export function useContextAppState({
  services,
  dataView,
}: {
  services: DiscoverServices;
  dataView: DataView;
}) {
  const { uiSettings: config, history, core } = services;

  const stateContainer = useMemo(() => {
    return getState({
      defaultSize: parseInt(config.get(CONTEXT_DEFAULT_SIZE_SETTING), 10),
      storeInSessionStorage: config.get('state:storeInSessionStorage'),
      history,
      toasts: core.notifications.toasts,
      uiSettings: config,
      data: services.data,
      dataView,
    });
  }, [config, history, core.notifications.toasts, services.data, dataView]);

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
      const newStateEnsureFilter = { ...newState, filters: newState.filters ?? [] };
      setAppState((prevState) => ({ ...prevState, ...newStateEnsureFilter }));
    });

    const unsubscribeGlobalState = stateContainer.globalState.subscribe((newState) => {
      const newStateEnsureFilter = { ...newState, filters: newState.filters ?? [] };
      setGlobalState((prevState) => ({ ...prevState, ...newStateEnsureFilter }));
    });

    return () => {
      unsubscribeAppState();
      unsubscribeGlobalState();
    };
  }, [stateContainer, setAppState]);

  return {
    appState,
    globalState,
    stateContainer,
  };
}
