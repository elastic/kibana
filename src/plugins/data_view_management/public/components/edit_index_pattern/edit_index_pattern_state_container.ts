/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHashHistory } from 'history';
import {
  createStateContainer,
  syncState,
  createKbnUrlStateStorage,
} from '@kbn/kibana-utils-plugin/public';

interface IEditIndexPatternState {
  tab: string;
  fieldTypes?: string[];
  schemaFieldTypes?: string[];
  fieldFilter?: string;
}

// query param to store app state at
export const APP_STATE_STORAGE_KEY = '_a';

/**
 * Create state container with sync config for tab navigation specific for edit_index_pattern page
 */
export function createEditIndexPatternPageStateContainer({
  defaultTab,
  useHashedUrl,
}: {
  defaultTab: string;
  useHashedUrl: boolean;
}) {
  const history = createHashHistory();
  // default app state, when there is no initial state in the url
  const defaultState = {
    tab: defaultTab,
  };
  const kbnUrlStateStorage = createKbnUrlStateStorage({
    useHash: useHashedUrl,
    history,
  });
  // extract starting app state from URL and use it as starting app state in state container
  const initialStateFromUrl = kbnUrlStateStorage.get<IEditIndexPatternState>(APP_STATE_STORAGE_KEY);
  const stateContainer = createStateContainer(
    {
      ...defaultState,
      ...initialStateFromUrl,
    },
    {
      setTab: (state: IEditIndexPatternState) => (tab: string) => ({ ...state, tab }),
      setFieldFilter: (state: IEditIndexPatternState) => (fieldFilter: string | undefined) => ({
        ...state,
        fieldFilter,
      }),
      setFieldTypes: (state: IEditIndexPatternState) => (fieldTypes: string[] | undefined) => ({
        ...state,
        fieldTypes: fieldTypes?.length ? fieldTypes : undefined,
      }),
      setSchemaFieldTypes:
        (state: IEditIndexPatternState) => (schemaFieldTypes: string[] | undefined) => ({
          ...state,
          schemaFieldTypes: schemaFieldTypes?.length ? schemaFieldTypes : undefined,
        }),
    },
    {
      tab: (state: IEditIndexPatternState) => () => state.tab,
      fieldFilter: (state: IEditIndexPatternState) => () => state.fieldFilter,
      fieldTypes: (state: IEditIndexPatternState) => () => state.fieldTypes,
      schemaFieldTypes: (state: IEditIndexPatternState) => () => state.schemaFieldTypes,
    }
  );

  const { start, stop } = syncState({
    storageKey: APP_STATE_STORAGE_KEY,
    stateContainer: {
      ...stateContainer,
      // state syncing utility requires state containers to handle "null"
      set: (state) => state && stateContainer.set(state),
    },
    stateStorage: kbnUrlStateStorage,
  });

  // makes sure initial url is the same as initial state (this is not really required)
  kbnUrlStateStorage.set(APP_STATE_STORAGE_KEY, stateContainer.getState(), { replace: true });

  return {
    stateContainer,
    startSyncingState: start,
    stopSyncingState: stop,
    setCurrentTab: (newTab: string) => stateContainer.transitions.setTab(newTab),
    setCurrentFieldFilter: (newFieldFilter: string | undefined) =>
      stateContainer.transitions.setFieldFilter(newFieldFilter),
    setCurrentFieldTypes: (newFieldTypes: string[] | undefined) =>
      stateContainer.transitions.setFieldTypes(newFieldTypes),
    setCurrentSchemaFieldTypes: (newSchemaFieldTypes: string[] | undefined) =>
      stateContainer.transitions.setSchemaFieldTypes(newSchemaFieldTypes),
  };
}
