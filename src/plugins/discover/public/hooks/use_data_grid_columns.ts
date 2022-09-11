/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';

import { Capabilities, IUiSettingsClient } from '@kbn/core/public';
import { GetStateReturn as DiscoverGetStateReturn } from '../application/main/services/discover_state';
import { GetStateReturn as ContextGetStateReturn } from '../application/context/services/context_state';
import { getStateColumnActions } from '../components/doc_table/actions/columns';

interface UseColumnsProps {
  capabilities: Capabilities;
  config: IUiSettingsClient;
  dataView: DataView;
  dataViews: DataViewsContract;
  useNewFieldsApi: boolean;
  stateContainer: DiscoverGetStateReturn | ContextGetStateReturn;
}

export const useColumns = ({
  capabilities,
  config,
  dataView,
  dataViews,
  stateContainer,
  useNewFieldsApi,
}: UseColumnsProps) => {
  const state = stateContainer.getAppState();
  const { setAppState } = stateContainer;
  const { onAddColumn, onRemoveColumn, onSetColumns, onMoveColumn } = useMemo(
    () =>
      getStateColumnActions({
        capabilities,
        config,
        dataView,
        dataViews,
        setAppState,
        state,
        useNewFieldsApi,
      }),
    [capabilities, config, dataView, dataViews, setAppState, state, useNewFieldsApi]
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
