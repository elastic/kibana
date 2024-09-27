/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState } from 'react';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';

import { Capabilities } from '@kbn/core/public';
import { isEqual } from 'lodash';
import { getStateColumnActions } from '../components/actions/columns';
import { UnifiedDataTableSettings } from '../types';

export interface UseColumnsProps {
  capabilities: Capabilities;
  dataView: DataView;
  dataViews: DataViewsContract;
  useNewFieldsApi: boolean;
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
  useNewFieldsApi,
  columns,
  sort,
  defaultOrder = 'desc',
  settings,
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
        dataView,
        dataViews,
        setAppState,
        useNewFieldsApi,
        columns: usedColumns,
        sort,
        defaultOrder,
        settings,
      }),
    [
      capabilities,
      dataView,
      dataViews,
      defaultOrder,
      setAppState,
      settings,
      sort,
      useNewFieldsApi,
      usedColumns,
    ]
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
