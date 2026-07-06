/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiFontSize, useEuiTheme } from '@elastic/eui';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { SortOrder, UnifiedDataTable } from '@kbn/unified-data-table';
import type { useKibana } from '../../../hooks/use_kibana';

export type WorkflowExecuteKibanaServices = ReturnType<typeof useKibana>['services'];

export type WorkflowExecuteUnifiedDataTableServices = React.ComponentProps<
  typeof UnifiedDataTable
>['services'];

export function buildUnifiedDataTableServices(
  services: WorkflowExecuteKibanaServices
): WorkflowExecuteUnifiedDataTableServices {
  return {
    theme: services.theme,
    fieldFormats: services.fieldFormats,
    uiSettings: services.uiSettings,
    toastNotifications: services.notifications.toasts,
    storage: services.storage,
    data: {
      ...services.data,
      dataViews: services.dataViews,
    },
  };
}

export const getNoUnifiedDataTableCellActions: UiActionsStart['getTriggerCompatibleActions'] =
  async () => [];

export interface UseUnifiedDataTableColumnStateOptions {
  defaultColumns: string[];
  dataView: DataView | null;
  fallbackColumns: readonly string[];
  ensureColumnWhenOnlyTimeField?: string;
  tableSort?: SortOrder[];
  onTableSortChange?: (sort: SortOrder[]) => void;
}

const parseDataGridSort = (nextSort: string[][]): SortOrder[] =>
  nextSort
    .filter(
      (value): value is [string, 'asc' | 'desc'] =>
        Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === 'string' &&
        (value[1] === 'asc' || value[1] === 'desc')
    )
    .map(([field, direction]) => [field, direction]);

export function useUnifiedDataTableColumnState(options: UseUnifiedDataTableColumnStateOptions) {
  const {
    defaultColumns,
    dataView,
    fallbackColumns,
    ensureColumnWhenOnlyTimeField,
    tableSort: controlledSort,
    onTableSortChange,
  } = options;

  const [visibleTableColumns, setVisibleTableColumns] = useState<string[]>(() => [
    ...defaultColumns,
  ]);
  const [showTimeColumn, setShowTimeColumn] = useState(true);
  const [internalSort, setInternalSort] = useState<SortOrder[]>([['@timestamp', 'desc']]);
  const sort = controlledSort ?? internalSort;

  const defaultColumnsKey = defaultColumns.join('\0');
  const defaultColumnsRef = useRef(defaultColumns);
  defaultColumnsRef.current = defaultColumns;

  useEffect(() => {
    setVisibleTableColumns((previous) => {
      const next = [...defaultColumnsRef.current];
      if (previous.join('\0') === next.join('\0')) {
        return previous;
      }
      return next;
    });
  }, [defaultColumnsKey]);

  const handleSortChange = useCallback(
    (nextSort: string[][]) => {
      const parsedSort = parseDataGridSort(nextSort);
      if (onTableSortChange) {
        onTableSortChange(parsedSort);
        return;
      }
      setInternalSort(parsedSort);
    },
    [onTableSortChange]
  );

  const handleUnifiedDataTableSetColumns = useCallback(
    (columns: string[], hideTimeColumn: boolean) => {
      let nextColumns = columns.length > 0 ? [...columns] : [...fallbackColumns];
      const timeFieldName = dataView?.timeFieldName;
      if (
        ensureColumnWhenOnlyTimeField &&
        timeFieldName &&
        nextColumns.length === 1 &&
        nextColumns[0] === timeFieldName
      ) {
        nextColumns = [...nextColumns, ensureColumnWhenOnlyTimeField];
      }
      setVisibleTableColumns(nextColumns);
      setShowTimeColumn(!hideTimeColumn);
    },
    [dataView?.timeFieldName, ensureColumnWhenOnlyTimeField, fallbackColumns]
  );

  return {
    visibleTableColumns,
    showTimeColumn,
    sort,
    handleSortChange,
    handleUnifiedDataTableSetColumns,
  };
}

export function useUnifiedDataTableTimestampTypography() {
  const euiThemeContext = useEuiTheme();
  return useMemo(() => euiFontSize(euiThemeContext, 'xs'), [euiThemeContext]);
}
