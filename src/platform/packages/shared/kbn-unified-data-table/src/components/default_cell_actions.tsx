/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';
import React, { useContext } from 'react';
import type { EuiDataGridColumnCellActionProps, EuiDataGridRefProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { ToastsStart } from '@kbn/core/public';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { shouldShowFieldFilterInOutActions } from '@kbn/unified-doc-viewer/utils/should_show_field_filter_actions';
import { getIgnoredReason } from '@kbn/discover-utils';
import type { DataTableContext } from '../table_context';
import { UnifiedDataTableContext } from '../table_context';
import { copyValueToClipboard } from '../utils/copy_value_to_clipboard';
import type { DocumentsDisplayMode, ValueToStringConverter } from '../types';

function onFilterCell(
  context: DataTableContext,
  rowIndex: EuiDataGridColumnCellActionProps['rowIndex'],
  columnId: EuiDataGridColumnCellActionProps['columnId'],
  mode: '+' | '-',
  field: DataViewField,
  dataGridRef?: MutableRefObject<EuiDataGridRefProps | null>
) {
  const row = context.getRowByIndex(rowIndex);

  if (row && field && context.onFilter) {
    const value = row.flattened[columnId];
    context.onFilter(field, value, mode);
    dataGridRef?.current?.closeCellPopover();
  }
}

/**
 * Elasticsearch did not index this value, so a filter built from it would never
 * match. Whether that happened is per document, not per column, so it cannot be
 * decided in `buildCellActions` alongside the other filter checks.
 */
function isCellValueIgnored(
  context: DataTableContext,
  rowIndex: EuiDataGridColumnCellActionProps['rowIndex'],
  field: DataViewField
): boolean {
  const row = context.getRowByIndex(rowIndex);
  return Boolean(row && getIgnoredReason(field, row.raw._ignored));
}

export const FilterInBtn = ({
  cellActionProps: { Component, rowIndex, columnId },
  field,
  dataGridRef,
}: {
  cellActionProps: EuiDataGridColumnCellActionProps;
  field: DataViewField;
  dataGridRef?: MutableRefObject<EuiDataGridRefProps | null>;
}) => {
  const context = useContext(UnifiedDataTableContext);
  const buttonTitle = i18n.translate('unifiedDataTable.grid.filterForAria', {
    defaultMessage: 'Filter for this {value}',
    values: { value: columnId },
  });

  if (isCellValueIgnored(context, rowIndex, field)) {
    return null;
  }

  return (
    <Component
      onClick={() => {
        onFilterCell(context, rowIndex, columnId, '+', field, dataGridRef);
      }}
      iconType="plusCircle"
      aria-label={buttonTitle}
      title={buttonTitle}
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
  dataGridRef,
}: {
  cellActionProps: EuiDataGridColumnCellActionProps;
  field: DataViewField;
  dataGridRef?: MutableRefObject<EuiDataGridRefProps | null>;
}) => {
  const context = useContext(UnifiedDataTableContext);
  const buttonTitle = i18n.translate('unifiedDataTable.grid.filterOutAria', {
    defaultMessage: 'Filter out this {value}',
    values: { value: columnId },
  });

  if (isCellValueIgnored(context, rowIndex, field)) {
    return null;
  }

  return (
    <Component
      onClick={() => {
        onFilterCell(context, rowIndex, columnId, '-', field, dataGridRef);
      }}
      iconType="minusCircle"
      aria-label={buttonTitle}
      title={buttonTitle}
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
  valueToStringConverter: ValueToStringConverter,
  documentsDisplayMode: DocumentsDisplayMode
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
      iconType="copy"
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
  toastNotifications: ToastsStart,
  valueToStringConverter: ValueToStringConverter,
  documentsDisplayMode: DocumentsDisplayMode,
  onFilter?: DocViewFilterFn,
  dataGridRef?: MutableRefObject<EuiDataGridRefProps | null>,
  hideFilteringOnComputedColumns?: boolean
) {
  const shouldShowFilters = shouldShowFieldFilterInOutActions({
    dataViewField: field,
    hideFilteringOnComputedColumns,
    onFilter,
  });

  return [
    ...(shouldShowFilters
      ? [
          (cellActionProps: EuiDataGridColumnCellActionProps) =>
            FilterInBtn({
              cellActionProps,
              field,
              dataGridRef,
            }),
          (cellActionProps: EuiDataGridColumnCellActionProps) =>
            FilterOutBtn({
              cellActionProps,
              field,
              dataGridRef,
            }),
        ]
      : []),
    ({ Component, rowIndex, columnId }: EuiDataGridColumnCellActionProps) =>
      buildCopyValueButton(
        { Component, rowIndex, columnId } as EuiDataGridColumnCellActionProps,
        toastNotifications,
        valueToStringConverter,
        documentsDisplayMode
      ),
  ];
}
