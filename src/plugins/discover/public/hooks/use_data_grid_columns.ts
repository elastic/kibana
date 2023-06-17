/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo, useRef } from 'react';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';

import { Capabilities, IUiSettingsClient } from '@kbn/core/public';
import { isEqual } from 'lodash';
import { DiscoverAppStateContainer } from '../application/main/services/discover_app_state_container';
import { GetStateReturn as ContextGetStateReturn } from '../application/context/services/context_state';
import { getStateColumnActions } from '../components/doc_table/actions/columns';

interface UseColumnsProps {
  capabilities: Capabilities;
  config: IUiSettingsClient;
  dataView?: DataView;
  dataViews: DataViewsContract;
  useNewFieldsApi: boolean;
  setAppState: DiscoverAppStateContainer['update'] | ContextGetStateReturn['setAppState'];
  columns?: string[];
  sort?: string[][];
  isTextBasedQueryLanguage?: boolean;
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
  isTextBasedQueryLanguage,
}: UseColumnsProps) => {
  const usedColumns = useRef(getColumns(columns, useNewFieldsApi));

  const actualColumns = useMemo(() => {
    if (isTextBasedQueryLanguage) {
      return columns;
    }
    const nextColumns = getColumns(columns, useNewFieldsApi);
    if (isEqual(usedColumns.current, nextColumns)) {
      return usedColumns.current;
    }
    usedColumns.current = nextColumns;
    return nextColumns;
  }, [columns, isTextBasedQueryLanguage, useNewFieldsApi]);
  const { onAddColumn, onRemoveColumn, onSetColumns, onMoveColumn } = useMemo(
    () =>
      getStateColumnActions({
        capabilities,
        config,
        dataView,
        dataViews,
        setAppState,
        useNewFieldsApi,
        columns: actualColumns,
        sort,
      }),
    [capabilities, config, dataView, dataViews, setAppState, sort, useNewFieldsApi, actualColumns]
  );

  return {
    columns: actualColumns ?? [],
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
