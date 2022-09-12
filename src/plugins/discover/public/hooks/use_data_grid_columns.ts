/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useMemo, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { isEqual } from 'lodash';
import { useDiscoverServices } from './use_discover_services';
import {
  AppState,
  GetStateReturn as DiscoverGetStateReturn,
} from '../application/main/services/discover_state';
import { GetStateReturn as ContextGetStateReturn } from '../application/context/services/context_state';
import { getStateColumnActions } from '../components/doc_table/actions/columns';

interface UseColumnsProps {
  dataView: DataView;
  useNewFieldsApi: boolean;
  stateContainer: DiscoverGetStateReturn | ContextGetStateReturn;
}

export const useColumns = ({ dataView, stateContainer, useNewFieldsApi }: UseColumnsProps) => {
  const { capabilities, dataViews, uiSettings } = useDiscoverServices();
  const [state, setState] = useState(
    getFieldsByState(stateContainer.getAppState(), useNewFieldsApi)
  );
  const { onAddColumn, onRemoveColumn, onSetColumns, onMoveColumn } = useMemo(
    () =>
      getStateColumnActions({
        capabilities,
        config: uiSettings,
        dataView,
        dataViews,
        setAppState: stateContainer.setAppState,
        state,
        useNewFieldsApi,
      }),
    [capabilities, uiSettings, dataView, dataViews, stateContainer, useNewFieldsApi, state]
  );
  useEffect(() => {
    const unsubscribe = stateContainer.appStateContainer.subscribe((nextState) => {
      const next = getFieldsByState(nextState, useNewFieldsApi);

      if (!isEqual(next, state)) {
        setState(next);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [state, stateContainer.appStateContainer, useNewFieldsApi]);

  return {
    columns: state.columns,
    onAddColumn,
    onRemoveColumn,
    onMoveColumn,
    onSetColumns,
  };
};

const getColumns = (nextColumns: string[] | undefined, useNewFieldsApi: boolean) => {
  if (!nextColumns) {
    return [];
  }
  return useNewFieldsApi ? nextColumns.filter((col) => col !== '_source') : nextColumns;
};

const getFieldsByState = (appState: AppState, useNewFieldsApi: boolean) => {
  const columns = getColumns(appState.columns, useNewFieldsApi);
  const sort = appState.sort;
  return { columns, sort };
};
