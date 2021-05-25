/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useEffect, useMemo, useState } from 'react';

import { cloneDeep } from 'lodash';
import { IndexPattern } from '../../../../../data/public';
import { DiscoverServices } from '../../../build_services';
import { AppState, getState } from '../../angular/context_state';
import { getContextQueryDefaults } from '../../angular/context_query_state';
import {
  CONTEXT_DEFAULT_SIZE_SETTING,
  CONTEXT_TIE_BREAKER_FIELDS_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
} from '../../../../common';
import { getFirstSortableField } from '../../angular/context/api/utils/sorting';

export function useContextAppState({
  indexPattern,
  indexPatternId,
  anchorId,
  services,
}: {
  indexPattern: IndexPattern;
  indexPatternId: string;
  anchorId: string;
  services: DiscoverServices;
}) {
  const { uiSettings: config, history, core, filterManager } = services;

  const stateContainer = useMemo(() => {
    const defaultStepSize = parseInt(config.get(CONTEXT_DEFAULT_SIZE_SETTING), 10);
    return getState({
      defaultStepSize,
      timeFieldName: indexPattern.timeFieldName as string,
      storeInSessionStorage: config.get('state:storeInSessionStorage'),
      history: history(),
      toasts: core.notifications.toasts,
      uiSettings: config,
      getContextQueryDefaults: () =>
        getContextQueryDefaults(
          indexPatternId,
          anchorId,
          defaultStepSize,
          getFirstSortableField(indexPattern, config.get(CONTEXT_TIE_BREAKER_FIELDS_SETTING)),
          !config.get(SEARCH_FIELDS_FROM_SOURCE)
        ),
    });
  }, [config, history, indexPattern, anchorId, indexPatternId, core.notifications.toasts]);

  const [state, setState] = useState<AppState>(stateContainer.appState.getState());

  /**
   * Sync app state
   */
  useEffect(() => {
    // take care of context state updates
    const unsubscribeAppState = stateContainer.appState.subscribe(async (newState) => {
      setState(newState);
    });

    return () => unsubscribeAppState();
  }, [stateContainer, setState, filterManager]);

  /**
   * Take care of filters
   */
  useEffect(() => {
    // sync initial app filters from state to filterManager
    const filters = stateContainer.appState.getState().filters;
    if (filters) {
      filterManager.setAppFilters(cloneDeep(filters));
    }

    const { setFilters } = stateContainer;
    const filterObservable = filterManager.getUpdates$().subscribe(() => {
      setFilters(filterManager);
    });

    return () => filterObservable.unsubscribe();
  }, [filterManager, stateContainer]);

  return {
    state,
    stateContainer,
    setAppState: stateContainer.setAppState,
  };
}
