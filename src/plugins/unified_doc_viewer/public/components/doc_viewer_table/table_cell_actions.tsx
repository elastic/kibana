/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DocViewFilterFn, FieldRecordLegacy } from '@kbn/unified-doc-viewer/types';

export interface TableRow {
  action: Omit<FieldRecordLegacy['action'], 'isActive'>;
  field: {
    pinned: boolean;
    onTogglePinned: (field: string) => void;
  } & FieldRecordLegacy['field'];
  value: FieldRecordLegacy['value'];
}

interface TableActionsProps {
  Component: EuiDataGridColumnCellActionProps['Component'];
  row: TableRow | undefined; // as we pass `rows[rowIndex]` it's safer to assume that `row` prop can be undefined
}

export function isFilterInOutPairDisabled(row: TableRow | undefined): boolean {
  if (!row) {
    return false;
  }
  const {
    action: { onFilter },
    field: { fieldMapping },
    value: { ignored },
  } = row;

  return Boolean(onFilter && (!fieldMapping || !fieldMapping.filterable || ignored));
}

export function getFilterInOutPairDisabledWarning(row: TableRow | undefined): string | undefined {
  if (!row || !isFilterInOutPairDisabled(row)) {
    return undefined;
  }
  const {
    field: { fieldMapping },
    value: { ignored },
  } = row;

  if (ignored) {
    return i18n.translate(
      'unifiedDocViewer.docViews.table.ignoredValuesCanNotBeSearchedWarningMessage',
      {
        defaultMessage: 'Ignored values cannot be searched',
      }
    );
  }

  return !fieldMapping
    ? i18n.translate(
        'unifiedDocViewer.docViews.table.unindexedFieldsCanNotBeSearchedWarningMessage',
        {
          defaultMessage: 'Unindexed fields cannot be searched',
        }
      )
    : undefined;
}

export const FilterIn: React.FC<TableActionsProps> = ({ Component, row }) => {
  if (!row) {
    return null;
  }

  const {
    action: { onFilter, flattenedField },
    field: { field, fieldMapping },
  } = row;

  // Filters pair
  const filterAddLabel = i18n.translate(
    'unifiedDocViewer.docViews.table.filterForValueButtonTooltip',
    {
      defaultMessage: 'Filter for value',
    }
  );

  if (!onFilter) {
    return null;
  }

  return (
    <Component
      data-test-subj={`addFilterForValueButton-${field}`}
      iconType="plusInCircle"
      disabled={isFilterInOutPairDisabled(row)}
      title={filterAddLabel}
      flush="left"
      onClick={() => onFilter(fieldMapping, flattenedField, '+')}
    >
      {filterAddLabel}
    </Component>
  );
};

export const FilterOut: React.FC<TableActionsProps> = ({ Component, row }) => {
  if (!row) {
    return null;
  }

  const {
    action: { onFilter, flattenedField },
    field: { field, fieldMapping },
  } = row;

  // Filters pair
  const filterOutLabel = i18n.translate(
    'unifiedDocViewer.docViews.table.filterOutValueButtonTooltip',
    {
      defaultMessage: 'Filter out value',
    }
  );

  if (!onFilter) {
    return null;
  }

  return (
    <Component
      data-test-subj={`addFilterOutValueButton-${field}`}
      iconType="minusInCircle"
      disabled={isFilterInOutPairDisabled(row)}
      title={filterOutLabel}
      flush="left"
      onClick={() => onFilter(fieldMapping, flattenedField, '-')}
    >
      {filterOutLabel}
    </Component>
  );
};

export function isFilterExistsDisabled(row: TableRow | undefined): boolean {
  if (!row) {
    return false;
  }
  const {
    action: { onFilter },
    field: { fieldMapping },
  } = row;

  return Boolean(onFilter && (!fieldMapping || !fieldMapping.filterable || fieldMapping.scripted));
}

export function getFilterExistsDisabledWarning(row: TableRow | undefined): string | undefined {
  if (!row || !isFilterExistsDisabled(row)) {
    return undefined;
  }
  const {
    field: { fieldMapping },
  } = row;

  return fieldMapping?.scripted
    ? i18n.translate(
        'unifiedDocViewer.docViews.table.unableToFilterForPresenceOfScriptedFieldsWarningMessage',
        {
          defaultMessage: 'Unable to filter for presence of scripted fields',
        }
      )
    : undefined;
}

export const FilterExist: React.FC<TableActionsProps> = ({ Component, row }) => {
  if (!row) {
    return null;
  }

  const {
    action: { onFilter },
    field: { field },
  } = row;

  // Filter exists
  const filterExistsLabel = i18n.translate(
    'unifiedDocViewer.docViews.table.filterForFieldPresentButtonTooltip',
    { defaultMessage: 'Filter for field present' }
  );

  if (!onFilter) {
    return null;
  }

  return (
    <Component
      data-test-subj={`addExistsFilterButton-${field}`}
      iconType="filter"
      disabled={isFilterExistsDisabled(row)}
      title={filterExistsLabel}
      flush="left"
      onClick={() => onFilter('_exists_', field, '+')}
    >
      {filterExistsLabel}
    </Component>
  );
};

export const ToggleColumn: React.FC<TableActionsProps> = ({ Component, row }) => {
  if (!row) {
    return null;
  }

  const {
    action: { onToggleColumn },
    field: { field },
  } = row;

  if (!onToggleColumn) {
    return null;
  }

  // Toggle column
  const toggleColumnLabel = i18n.translate(
    'unifiedDocViewer.docViews.table.toggleColumnTableButtonTooltip',
    {
      defaultMessage: 'Toggle column in table',
    }
  );

  return (
    <Component
      data-test-subj={`toggleColumnButton-${field}`}
      iconType="listAdd"
      title={toggleColumnLabel}
      flush="left"
      onClick={() => onToggleColumn(field)}
    >
      {toggleColumnLabel}
    </Component>
  );
};

export function getFieldCellActions({
  rows,
  filter,
  onToggleColumn,
}: {
  rows: TableRow[];
  filter?: DocViewFilterFn;
  onToggleColumn: ((field: string) => void) | undefined;
}) {
  return [
    ...(filter
      ? [
          ({ Component, rowIndex }: EuiDataGridColumnCellActionProps) => {
            return <FilterExist row={rows[rowIndex]} Component={Component} />;
          },
        ]
      : []),
    ...(onToggleColumn
      ? [
          ({ Component, rowIndex }: EuiDataGridColumnCellActionProps) => {
            return <ToggleColumn row={rows[rowIndex]} Component={Component} />;
          },
        ]
      : []),
  ];
}

export function getFieldValueCellActions({
  rows,
  filter,
}: {
  rows: TableRow[];
  filter?: DocViewFilterFn;
}) {
  return filter
    ? [
        ({ Component, rowIndex }: EuiDataGridColumnCellActionProps) => {
          return <FilterIn row={rows[rowIndex]} Component={Component} />;
        },
        ({ Component, rowIndex }: EuiDataGridColumnCellActionProps) => {
          return <FilterOut row={rows[rowIndex]} Component={Component} />;
        },
      ]
    : [];
}
