/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { copyToClipboard } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import {
  shouldShowFieldFilterExistAction,
  shouldShowFieldFilterInOutActions,
} from '@kbn/unified-doc-viewer/utils/should_show_field_filter_actions';
import type { IToasts } from '@kbn/core/public';
import type { FieldRow } from './field_row';

interface TableActionsProps {
  Component: EuiDataGridColumnCellActionProps['Component'];
  row: FieldRow | undefined; // as we pass `rows[rowIndex]` it's safer to assume that `row` prop can be undefined
  isEsqlMode: boolean | undefined;
  columns?: string[];
  hideFilteringOnComputedColumns?: boolean;
}

type CheckFilterParams = Pick<TableActionsProps, 'row' | 'hideFilteringOnComputedColumns'> & {
  onFilter: DocViewFilterFn | undefined;
};

function isFilterDisabledDueToIgnoredReason({ row, onFilter }: CheckFilterParams): boolean {
  if (!row) {
    return false;
  }

  const { ignoredReason } = row;
  return Boolean(onFilter && ignoredReason);
}

function isFilterInOutPairDisabled(params: CheckFilterParams): boolean {
  const { row, onFilter, hideFilteringOnComputedColumns } = params;
  if (!row) {
    return false;
  }

  return (
    !shouldShowFieldFilterInOutActions({
      dataViewField: row.dataViewField,
      onFilter,
      hideFilteringOnComputedColumns,
    }) || isFilterDisabledDueToIgnoredReason(params)
  );
}

export function getFilterInOutPairDisabledWarning(params: CheckFilterParams): string | undefined {
  const { row } = params;
  if (!row || !isFilterInOutPairDisabled(params)) {
    return undefined;
  }

  const { dataViewField } = row;

  if (isFilterDisabledDueToIgnoredReason(params)) {
    return i18n.translate(
      'unifiedDocViewer.docViews.table.ignoredValuesCanNotBeSearchedWarningMessage',
      {
        defaultMessage: 'Ignored values cannot be searched',
      }
    );
  }

  return !dataViewField
    ? i18n.translate(
        'unifiedDocViewer.docViews.table.unindexedFieldsCanNotBeSearchedWarningMessage',
        {
          defaultMessage: 'Unindexed fields cannot be searched',
        }
      )
    : undefined;
}

const Copy: React.FC<Omit<TableActionsProps, 'isEsqlMode'> & { toasts: IToasts }> = ({
  Component,
  row,
  toasts,
}) => {
  if (!row) {
    return null;
  }

  const { name } = row;

  const copyLabel = i18n.translate('unifiedDocViewer.docViews.table.copyValue', {
    defaultMessage: 'Copy value',
  });

  return (
    <Component
      data-test-subj={`copyValueButton-${name}`}
      iconType="copyClipboard"
      title={copyLabel}
      flush="left"
      onClick={() => {
        const errorMessage = i18n.translate(
          'unifiedDocViewer.tableCellActions.copyFailedErrorText',
          {
            defaultMessage: 'Unable to copy to clipboard in this browser',
          }
        );

        if (!row.formattedAsText) {
          toasts.addWarning({
            title: errorMessage,
          });
          return;
        }

        const copied = copyToClipboard(row.formattedAsText);
        if (!copied) {
          toasts.addWarning({
            title: errorMessage,
          });
          return;
        }

        toasts.addInfo({
          title: i18n.translate(
            'unifiedDocViewer.tableCellActions.copyValueToClipboard.toastTitle',
            {
              defaultMessage: 'Copied to clipboard',
            }
          ),
        });
      }}
    >
      {copyLabel}
    </Component>
  );
};

const FilterIn: React.FC<TableActionsProps & { onFilter: DocViewFilterFn | undefined }> = ({
  Component,
  row,
  isEsqlMode,
  onFilter,
  hideFilteringOnComputedColumns,
}) => {
  if (!row) {
    return null;
  }

  const { dataViewField, name, flattenedValue } = row;

  // Filters pair
  const filterAddLabel = i18n.translate(
    'unifiedDocViewer.docViews.table.filterForValueButtonTooltip',
    {
      defaultMessage: 'Filter for value',
    }
  );

  if (
    isFilterInOutPairDisabled({
      row,
      onFilter,
      hideFilteringOnComputedColumns,
    })
  ) {
    return null;
  }

  return (
    <Component
      data-test-subj={`addFilterForValueButton-${name}`}
      iconType="plusInCircle"
      title={filterAddLabel}
      flush="left"
      onClick={() => onFilter!(dataViewField, flattenedValue, '+')}
    >
      {filterAddLabel}
    </Component>
  );
};

const FilterOut: React.FC<TableActionsProps & { onFilter: DocViewFilterFn | undefined }> = ({
  Component,
  row,
  isEsqlMode,
  onFilter,
  hideFilteringOnComputedColumns,
}) => {
  if (!row) {
    return null;
  }

  const { dataViewField, name, flattenedValue } = row;

  // Filters pair
  const filterOutLabel = i18n.translate(
    'unifiedDocViewer.docViews.table.filterOutValueButtonTooltip',
    {
      defaultMessage: 'Filter out value',
    }
  );

  if (
    isFilterInOutPairDisabled({
      row,
      onFilter,
      hideFilteringOnComputedColumns,
    })
  ) {
    return null;
  }

  return (
    <Component
      data-test-subj={`addFilterOutValueButton-${name}`}
      iconType="minusInCircle"
      title={filterOutLabel}
      flush="left"
      onClick={() => onFilter!(dataViewField, flattenedValue, '-')}
    >
      {filterOutLabel}
    </Component>
  );
};

function isFilterExistsDisabled(params: CheckFilterParams): boolean {
  const { row, onFilter, hideFilteringOnComputedColumns } = params;
  if (!row) {
    return false;
  }

  return !shouldShowFieldFilterExistAction({
    dataViewField: row.dataViewField,
    onFilter,
    hideFilteringOnComputedColumns,
  });
}

export function getFilterExistsDisabledWarning(params: CheckFilterParams): string | undefined {
  const { row } = params;
  if (!row || !isFilterExistsDisabled(params)) {
    return undefined;
  }
  const { dataViewField } = row;

  return dataViewField?.scripted
    ? i18n.translate(
        'unifiedDocViewer.docViews.table.unableToFilterForPresenceOfScriptedFieldsWarningMessage',
        {
          defaultMessage: 'Unable to filter for presence of scripted fields',
        }
      )
    : undefined;
}

const FilterExist: React.FC<TableActionsProps & { onFilter: DocViewFilterFn | undefined }> = ({
  Component,
  row,
  isEsqlMode,
  hideFilteringOnComputedColumns,
  onFilter,
}) => {
  if (!row) {
    return null;
  }

  const { name } = row;

  // Filter exists
  const filterExistsLabel = i18n.translate(
    'unifiedDocViewer.docViews.table.filterForFieldPresentButtonTooltip',
    { defaultMessage: 'Filter for field present' }
  );

  if (
    isFilterExistsDisabled({
      row,
      onFilter,
      hideFilteringOnComputedColumns,
    })
  ) {
    return null;
  }

  return (
    <Component
      data-test-subj={`addExistsFilterButton-${name}`}
      iconType="filter"
      title={filterExistsLabel}
      flush="left"
      onClick={() => onFilter!('_exists_', name, '+')}
    >
      {filterExistsLabel}
    </Component>
  );
};

// Toggle column
const toggleColumnLabel = i18n.translate(
  'unifiedDocViewer.docViews.table.toggleColumnTableButtonTooltip',
  {
    defaultMessage: 'Toggle column in table',
  }
);

const ToggleColumn: React.FC<
  TableActionsProps & {
    onToggleColumn: ((field: string) => void) | undefined;
  }
> = ({ Component, columns, row, onToggleColumn }) => {
  if (!row) {
    return null;
  }

  const { name } = row;

  if (!onToggleColumn) {
    return null;
  }

  const isColumnAdded = columns?.includes(name);

  return (
    <Component
      data-test-subj={`toggleColumnButton-${name}`}
      iconType={isColumnAdded ? 'cross' : 'plusInCircle'}
      title={toggleColumnLabel}
      flush="left"
      onClick={() => onToggleColumn(name)}
    >
      {toggleColumnLabel}
    </Component>
  );
};

export function getFieldCellActions({
  rows,
  columns,
  isEsqlMode,
  hideFilteringOnComputedColumns,
  onFilter,
  onToggleColumn,
}: {
  rows: FieldRow[];
  columns?: string[];
  isEsqlMode: boolean | undefined;
  hideFilteringOnComputedColumns?: boolean;
  onFilter?: DocViewFilterFn;
  onToggleColumn: ((field: string) => void) | undefined;
}) {
  return [
    ...(onFilter
      ? [
          ({ Component, rowIndex }: EuiDataGridColumnCellActionProps) => {
            return (
              <FilterExist
                row={rows[rowIndex]}
                Component={Component}
                isEsqlMode={isEsqlMode}
                onFilter={onFilter}
                hideFilteringOnComputedColumns={hideFilteringOnComputedColumns}
              />
            );
          },
        ]
      : []),
    ...(onToggleColumn
      ? [
          ({ Component, rowIndex }: EuiDataGridColumnCellActionProps) => {
            return (
              <ToggleColumn
                row={rows[rowIndex]}
                columns={columns}
                Component={Component}
                isEsqlMode={isEsqlMode}
                onToggleColumn={onToggleColumn}
              />
            );
          },
        ]
      : []),
  ];
}

export function getFieldValueCellActions({
  rows,
  isEsqlMode,
  hideFilteringOnComputedColumns,
  onFilter,
  toasts,
}: {
  rows: FieldRow[];
  isEsqlMode: boolean | undefined;
  hideFilteringOnComputedColumns?: boolean;
  onFilter?: DocViewFilterFn;
  toasts: IToasts;
}) {
  const filterActions = onFilter
    ? [
        ({ Component, rowIndex }: EuiDataGridColumnCellActionProps) => {
          return (
            <FilterIn
              row={rows[rowIndex]}
              Component={Component}
              isEsqlMode={isEsqlMode}
              onFilter={onFilter}
              hideFilteringOnComputedColumns={hideFilteringOnComputedColumns}
            />
          );
        },
        ({ Component, rowIndex }: EuiDataGridColumnCellActionProps) => {
          return (
            <FilterOut
              row={rows[rowIndex]}
              Component={Component}
              isEsqlMode={isEsqlMode}
              onFilter={onFilter}
              hideFilteringOnComputedColumns={hideFilteringOnComputedColumns}
            />
          );
        },
      ]
    : [];

  const copyAction = ({ Component, rowIndex }: EuiDataGridColumnCellActionProps) => {
    return <Copy toasts={toasts} row={rows[rowIndex]} Component={Component} />;
  };

  return [...filterActions, copyAction];
}
