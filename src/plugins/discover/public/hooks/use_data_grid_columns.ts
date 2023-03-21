/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useMemo, useState } from 'react';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';

import { Capabilities, IUiSettingsClient } from '@kbn/core/public';
import { isEqual } from 'lodash';
import { DiscoverAppStateContainer } from '../application/main/services/discover_app_state_container';
import { GetStateReturn as ContextGetStateReturn } from '../application/context/services/context_state';
import { getStateColumnActions } from '../components/doc_table/actions/columns';

interface UseColumnsProps {
  capabilities: Capabilities;
  config: IUiSettingsClient;
  dataView: DataView;
  dataViews: DataViewsContract;
  useNewFieldsApi: boolean;
  setAppState: DiscoverAppStateContainer['update'] | ContextGetStateReturn['setAppState'];
  columns?: string[];
  sort?: string[][];
}

export const useColumns = ({
  capabilities,
  config,
  dataView,
  dataViews,
  setAppState,
  useNewFieldsApi,
  columns,
  sort,
}: UseColumnsProps) => {
  const [usedColumns, setUsedColumns] = useState(getColumns(columns, useNewFieldsApi));
  useEffect(() => {
    const nextColumns = getColumns(columns, useNewFieldsApi);
    if (isEqual(usedColumns, nextColumns)) {
      return;
    }
    setUsedColumns(nextColumns);
  }, [columns, useNewFieldsApi, usedColumns]);
  const { onAddColumn, onRemoveColumn, onSetColumns, onMoveColumn } = useMemo(
    () =>
      getStateColumnActions({
        capabilities,
        config,
        dataView,
        dataViews,
        setAppState,
        useNewFieldsApi,
        columns: usedColumns,
        sort,
      }),
    [capabilities, config, dataView, dataViews, setAppState, sort, useNewFieldsApi, usedColumns]
  );

  return {
    columns: usedColumns,
    onAddColumn,
    onRemoveColumn,
    onMoveColumn,
    onSetColumns,
  };
};

function getColumns(columns: string[] | undefined, useNewFieldsApi: boolean) {
  if (!columns) {
    return [];
  }
  return useNewFieldsApi ? columns.filter((col) => col !== '_source') : columns;
}
