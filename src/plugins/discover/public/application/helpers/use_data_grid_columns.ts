/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';
import type { IndexPattern, IndexPatternsContract } from 'src/plugins/data/common';

import { Capabilities, IUiSettingsClient } from 'kibana/public';
import {
  AppState as DiscoverState,
  GetStateReturn as DiscoverGetStateReturn,
} from '../apps/main/services/discover_state';
import {
  AppState as ContextState,
  GetStateReturn as ContextGetStateReturn,
} from '../apps/context/services/context_state';
import { getStateColumnActions } from '../apps/main/components/doc_table/actions/columns';

interface UseDataGridColumnsProps {
  capabilities: Capabilities;
  config: IUiSettingsClient;
  indexPattern: IndexPattern;
  indexPatterns: IndexPatternsContract;
  useNewFieldsApi: boolean;
  setAppState: DiscoverGetStateReturn['setAppState'] | ContextGetStateReturn['setAppState'];
  state: DiscoverState | ContextState;
}

export const useDataGridColumns = ({
  capabilities,
  config,
  indexPattern,
  indexPatterns,
  setAppState,
  state,
  useNewFieldsApi,
}: UseDataGridColumnsProps) => {
  const { onAddColumn, onRemoveColumn, onSetColumns, onMoveColumn } = useMemo(
    () =>
      getStateColumnActions({
        capabilities,
        config,
        indexPattern,
        indexPatterns,
        setAppState,
        state,
        useNewFieldsApi,
      }),
    [capabilities, config, indexPattern, indexPatterns, setAppState, state, useNewFieldsApi]
  );

  const columns = useMemo(() => {
    if (!state.columns) {
      return [];
    }
    return useNewFieldsApi ? state.columns.filter((col) => col !== '_source') : state.columns;
  }, [state, useNewFieldsApi]);

  return {
    columns,
    onAddColumn,
    onRemoveColumn,
    onMoveColumn,
    onSetColumns,
  };
};
