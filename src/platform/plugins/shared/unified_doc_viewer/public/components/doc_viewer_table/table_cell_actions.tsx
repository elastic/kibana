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
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { FieldRow } from './field_row';

interface TableActionsProps {
  Component: EuiDataGridColumnCellActionProps['Component'];
  row: FieldRow | undefined; // as we pass `rows[rowIndex]` it's safer to assume that `row` prop can be undefined
  isEsqlMode: boolean | undefined;
}

function isFilterInOutPairDisabled(
  row: FieldRow | undefined,
  onFilter: DocViewFilterFn | undefined
): boolean {
  if (!row) {
    return false;
  }
  const { dataViewField, ignoredReason } = row;

  return Boolean(onFilter && (!dataViewField || !dataViewField.filterable || ignoredReason));
}

export function getFilterInOutPairDisabledWarning(
  row: FieldRow | undefined,
  onFilter: DocViewFilterFn | undefined
): string | undefined {
  if (!row || !isFilterInOutPairDisabled(row, onFilter)) {
    return undefined;
  }
  const { dataViewField, ignoredReason } = row;

  if (ignoredReason) {
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

const esqlMultivalueFilteringDisabled = i18n.translate(
  'unifiedDocViewer.docViews.table.esqlMultivalueFilteringDisabled',
  {
    defaultMessage: 'Multivalue filtering is not supported in ES|QL',
  }
);

const FilterIn: React.FC<TableActionsProps & { onFilter: DocViewFilterFn | undefined }> = ({
  Component,
  row,
  isEsqlMode,
  onFilter,
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

  if (!onFilter) {
    return null;
  }

  const filteringDisabled = isEsqlMode && Array.isArray(flattenedValue);

  return (
    <Component
      data-test-subj={`addFilterForValueButton-${name}`}
      iconType="plusInCircle"
      disabled={filteringDisabled || isFilterInOutPairDisabled(row, onFilter)}
      title={filteringDisabled ? esqlMultivalueFilteringDisabled : filterAddLabel}
      flush="left"
      onClick={() => onFilter(dataViewField, flattenedValue, '+')}
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

  if (!onFilter) {
    return null;
  }

  const filteringDisabled = isEsqlMode && Array.isArray(flattenedValue);

  return (
    <Component
      data-test-subj={`addFilterOutValueButton-${name}`}
      iconType="minusInCircle"
      disabled={filteringDisabled || isFilterInOutPairDisabled(row, onFilter)}
      title={filteringDisabled ? esqlMultivalueFilteringDisabled : filterOutLabel}
      flush="left"
      onClick={() => onFilter(dataViewField, flattenedValue, '-')}
    >
      {filterOutLabel}
    </Component>
  );
};

function isFilterExistsDisabled(
  row: FieldRow | undefined,
  onFilter: DocViewFilterFn | undefined
): boolean {
  if (!row) {
    return false;
  }
  const { dataViewField } = row;

  return Boolean(
    onFilter && (!dataViewField || !dataViewField.filterable || dataViewField.scripted)
  );
}

export function getFilterExistsDisabledWarning(
  row: FieldRow | undefined,
  onFilter: DocViewFilterFn | undefined
): string | undefined {
  if (!row || !isFilterExistsDisabled(row, onFilter)) {
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

  if (!onFilter) {
    return null;
  }

  return (
    <Component
      data-test-subj={`addExistsFilterButton-${name}`}
      iconType="filter"
      disabled={isFilterExistsDisabled(row, onFilter)}
      title={filterExistsLabel}
      flush="left"
      onClick={() => onFilter('_exists_', name, '+')}
    >
      {filterExistsLabel}
    </Component>
  );
};

const ToggleColumn: React.FC<
  TableActionsProps & {
    onToggleColumn: ((field: string) => void) | undefined;
  }
> = ({ Component, row, onToggleColumn }) => {
  if (!row) {
    return null;
  }

  const { name } = row;

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
      data-test-subj={`toggleColumnButton-${name}`}
      iconType="listAdd"
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
  isEsqlMode,
  onFilter,
  onToggleColumn,
}: {
  rows: FieldRow[];
  isEsqlMode: boolean | undefined;
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
  onFilter,
}: {
  rows: FieldRow[];
  isEsqlMode: boolean | undefined;
  onFilter?: DocViewFilterFn;
}) {
  return onFilter
    ? [
        ({ Component, rowIndex }: EuiDataGridColumnCellActionProps) => {
          return (
            <FilterIn
              row={rows[rowIndex]}
              Component={Component}
              isEsqlMode={isEsqlMode}
              onFilter={onFilter}
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
            />
          );
        },
      ]
    : [];
}
