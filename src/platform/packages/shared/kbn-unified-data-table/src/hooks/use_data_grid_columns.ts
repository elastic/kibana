/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';

import type { Capabilities } from '@kbn/core/public';
import { isEqual } from 'lodash';
import { getStateColumnActions } from '../components/actions/columns';
import type { UnifiedDataTableSettings } from '../types';

export interface UseColumnsProps {
  capabilities: Capabilities;
  dataView: DataView;
  dataViews: DataViewsContract;
  setAppState: (state: {
    columns: string[];
    sort?: string[][];
    settings?: UnifiedDataTableSettings;
  }) => void;
  columns?: string[];
  sort?: string[][];
  defaultOrder?: string;
  settings?: UnifiedDataTableSettings;
}

export const useColumns = ({
  capabilities,
  dataView,
  dataViews,
  setAppState,
  columns,
  sort,
  defaultOrder = 'desc',
  settings,
}: UseColumnsProps) => {
  const [usedColumns, setUsedColumns] = useState(getColumns(columns));
  // The column actions derive the next column list from the current one, so they must read it
  // through a ref: several actions can be dispatched before the updated `columns` prop has made
  // its way back down, and a captured render value would make each one discard the previous.
  const latestColumnsRef = useRef(usedColumns);

  useEffect(() => {
    const nextColumns = getColumns(columns);
    if (isEqual(usedColumns, nextColumns)) {
      return;
    }
    latestColumnsRef.current = nextColumns;
    setUsedColumns(nextColumns);
  }, [columns, usedColumns]);

  const onAppStateChange = useCallback<UseColumnsProps['setAppState']>(
    (state) => {
      latestColumnsRef.current = state.columns;
      setAppState(state);
    },
    [setAppState]
  );

  const getColumnActions = useCallback(
    () =>
      getStateColumnActions({
        capabilities,
        dataView,
        dataViews,
        setAppState: onAppStateChange,
        columns: latestColumnsRef.current,
        sort,
        defaultOrder,
        settings,
      }),
    [capabilities, dataView, dataViews, defaultOrder, onAppStateChange, settings, sort]
  );

  const onAddColumn = useCallback(
    (columnName: string) => getColumnActions().onAddColumn(columnName),
    [getColumnActions]
  );

  const onRemoveColumn = useCallback(
    (columnName: string) => getColumnActions().onRemoveColumn(columnName),
    [getColumnActions]
  );

  const onMoveColumn = useCallback(
    (columnName: string, newIndex: number) => getColumnActions().onMoveColumn(columnName, newIndex),
    [getColumnActions]
  );

  const onSetColumns = useCallback(
    (nextColumns: string[], hideTimeColumn: boolean) =>
      getColumnActions().onSetColumns(nextColumns, hideTimeColumn),
    [getColumnActions]
  );

  return {
    columns: usedColumns,
    onAddColumn,
    onRemoveColumn,
    onMoveColumn,
    onSetColumns,
  };
};

function getColumns(columns: string[] | undefined) {
  return columns ?? [];
}
