/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext } from 'react';
import { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { ToastsStart } from '@kbn/core/public';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { UnifiedDataTableContext, DataTableContext } from '../table_context';
import { copyValueToClipboard } from '../utils/copy_value_to_clipboard';
import { ValueToStringConverter } from '../types';

function onFilterCell(
  context: DataTableContext,
  rowIndex: EuiDataGridColumnCellActionProps['rowIndex'],
  columnId: EuiDataGridColumnCellActionProps['columnId'],
  mode: '+' | '-',
  field: DataViewField
) {
  const row = context.getRowByIndex(rowIndex);

  if (row && field && context.onFilter) {
    const value = row.flattened[columnId];
    context.onFilter(field, value, mode);
  }
}

const esqlMultivalueFilteringDisabled = i18n.translate(
  'unifiedDataTable.grid.esqlMultivalueFilteringDisabled',
  {
    defaultMessage: 'Multivalue filtering is not supported in ES|QL',
  }
);

export const FilterInBtn = ({
  cellActionProps: { Component, rowIndex, columnId },
  field,
  isPlainRecord,
}: {
  cellActionProps: EuiDataGridColumnCellActionProps;
  field: DataViewField;
  isPlainRecord: boolean | undefined;
}) => {
  const context = useContext(UnifiedDataTableContext);
  const filteringDisabled =
    isPlainRecord && Array.isArray(context.getRowByIndex(rowIndex)?.flattened[columnId]);
  const buttonTitle = i18n.translate('unifiedDataTable.grid.filterForAria', {
    defaultMessage: 'Filter for this {value}',
    values: { value: columnId },
  });

  return (
    <Component
      onClick={() => {
        onFilterCell(context, rowIndex, columnId, '+', field);
      }}
      iconType="plusInCircle"
      aria-label={buttonTitle}
      title={filteringDisabled ? esqlMultivalueFilteringDisabled : buttonTitle}
      disabled={filteringDisabled}
      data-test-subj="filterForButton"
    >
      {i18n.translate('unifiedDataTable.grid.filterFor', {
        defaultMessage: 'Filter for',
      })}
    </Component>
  );
};

export const FilterOutBtn = ({
  cellActionProps: { Component, rowIndex, columnId },
  field,
  isPlainRecord,
}: {
  cellActionProps: EuiDataGridColumnCellActionProps;
  field: DataViewField;
  isPlainRecord: boolean | undefined;
}) => {
  const context = useContext(UnifiedDataTableContext);
  const filteringDisabled =
    isPlainRecord && Array.isArray(context.getRowByIndex(rowIndex)?.flattened[columnId]);
  const buttonTitle = i18n.translate('unifiedDataTable.grid.filterOutAria', {
    defaultMessage: 'Filter out this {value}',
    values: { value: columnId },
  });

  return (
    <Component
      onClick={() => {
        onFilterCell(context, rowIndex, columnId, '-', field);
      }}
      iconType="minusInCircle"
      aria-label={buttonTitle}
      title={filteringDisabled ? esqlMultivalueFilteringDisabled : buttonTitle}
      disabled={filteringDisabled}
      data-test-subj="filterOutButton"
    >
      {i18n.translate('unifiedDataTable.grid.filterOut', {
        defaultMessage: 'Filter out',
      })}
    </Component>
  );
};

export function buildCopyValueButton(
  { Component, rowIndex, columnId }: EuiDataGridColumnCellActionProps,
  toastNotifications: ToastsStart,
  valueToStringConverter: ValueToStringConverter
) {
  const buttonTitle = i18n.translate('unifiedDataTable.grid.copyClipboardButtonTitle', {
    defaultMessage: 'Copy value of {column}',
    values: { column: columnId },
  });

  return (
    <Component
      onClick={() => {
        copyValueToClipboard({
          rowIndex,
          columnId,
          valueToStringConverter,
          toastNotifications,
        });
      }}
      iconType="copyClipboard"
      aria-label={buttonTitle}
      title={buttonTitle}
      data-test-subj="copyClipboardButton"
    >
      {i18n.translate('unifiedDataTable.grid.copyCellValueButton', {
        defaultMessage: 'Copy value',
      })}
    </Component>
  );
}

export function buildCellActions(
  field: DataViewField,
  isPlainRecord: boolean | undefined,
  toastNotifications: ToastsStart,
  valueToStringConverter: ValueToStringConverter,
  onFilter?: DocViewFilterFn
) {
  return [
    ...(onFilter && field.filterable
      ? [
          (cellActionProps: EuiDataGridColumnCellActionProps) =>
            FilterInBtn({
              cellActionProps,
              field,
              isPlainRecord,
            }),
          (cellActionProps: EuiDataGridColumnCellActionProps) =>
            FilterOutBtn({
              cellActionProps,
              field,
              isPlainRecord,
            }),
        ]
      : []),
    ({ Component, rowIndex, columnId }: EuiDataGridColumnCellActionProps) =>
      buildCopyValueButton(
        { Component, rowIndex, columnId } as EuiDataGridColumnCellActionProps,
        toastNotifications,
        valueToStringConverter
      ),
  ];
}
