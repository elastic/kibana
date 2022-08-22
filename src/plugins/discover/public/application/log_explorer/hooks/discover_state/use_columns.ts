/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useMemo } from 'react';
import createContainer from 'constate';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useColumns as useDiscoverColumns } from '../../../../hooks/use_data_grid_columns';
import { useDiscoverStateContext } from './use_discover_state';
import { useStateMachineContext } from '../query_data/use_state_machine';

const MESSAGE_FIELD = 'message';

export const useColumns = () => {
  const { capabilities, dataViews, uiSettings } = useDiscoverServices();
  const { dataView, state, stateContainer } = useDiscoverStateContext();
  const dataAccessService = useStateMachineContext();

  const { columns, onAddColumn, onRemoveColumn, onSetColumns } = useDiscoverColumns({
    capabilities,
    config: uiSettings,
    dataView,
    dataViews,
    setAppState: stateContainer.setAppState,
    state,
    useNewFieldsApi: true,
  });

  const onResize = useCallback(
    (colSettings: { columnId: string; width: number }) => {
      const grid = { ...state.grid } || {};
      const newColumns = { ...grid.columns } || {};
      newColumns[colSettings.columnId] = {
        width: colSettings.width,
      };
      const newGrid = { ...grid, columns: newColumns };
      stateContainer.setAppState({ grid: newGrid });
    },
    [stateContainer, state]
  );

  const columnsWithDefaults = useMemo(() => {
    return columns.length > 0 ? columns : [dataView.timeFieldName ?? '@timestamp', MESSAGE_FIELD];
  }, [columns, dataView]);

  useEffect(() => {
    dataAccessService.send({
      type: 'columnsChanged',
    });
  }, [columnsWithDefaults, dataAccessService]);

  return {
    columns: columnsWithDefaults,
    onAddColumn,
    onSetColumns,
    onRemoveColumn,
    onResize,
  };
};
export const [DiscoverColumnsProvider, useDiscoverColumnsContext] = createContainer(useColumns);
