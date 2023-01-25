/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';
import { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { DocViewFilterFn } from '../../services/doc_views/doc_views_types';
import { DiscoverGridContext, GridContext } from './discover_grid_context';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { copyValueToClipboard } from '../../utils/copy_value_to_clipboard';

function onFilterCell(
  context: GridContext,
  rowIndex: EuiDataGridColumnCellActionProps['rowIndex'],
  columnId: EuiDataGridColumnCellActionProps['columnId'],
  mode: '+' | '-'
) {
  const row = context.rows[rowIndex];
  const value = row.flattened[columnId];
  const field = context.dataView.fields.getByName(columnId);

  if (field && context.onFilter) {
    context.onFilter(field, value, mode);
  }
}

export const FilterInBtn = ({
  Component,
  rowIndex,
  columnId,
}: EuiDataGridColumnCellActionProps) => {
  const context = useContext(DiscoverGridContext);
  const buttonTitle = i18n.translate('discover.grid.filterForAria', {
    defaultMessage: 'Filter for this {value}',
    values: { value: columnId },
  });

  return (
    <Component
      onClick={() => {
        onFilterCell(context, rowIndex, columnId, '+');
      }}
      iconType="plusInCircle"
      aria-label={buttonTitle}
      title={buttonTitle}
      data-test-subj="filterForButton"
    >
      {i18n.translate('discover.grid.filterFor', {
        defaultMessage: 'Filter for',
      })}
    </Component>
  );
};

export const FilterOutBtn = ({
  Component,
  rowIndex,
  columnId,
}: EuiDataGridColumnCellActionProps) => {
  const context = useContext(DiscoverGridContext);
  const buttonTitle = i18n.translate('discover.grid.filterOutAria', {
    defaultMessage: 'Filter out this {value}',
    values: { value: columnId },
  });

  return (
    <Component
      onClick={() => {
        onFilterCell(context, rowIndex, columnId, '-');
      }}
      iconType="minusInCircle"
      aria-label={buttonTitle}
      title={buttonTitle}
      data-test-subj="filterOutButton"
    >
      {i18n.translate('discover.grid.filterOut', {
        defaultMessage: 'Filter out',
      })}
    </Component>
  );
};

export const CopyBtn = ({ Component, rowIndex, columnId }: EuiDataGridColumnCellActionProps) => {
  const { valueToStringConverter } = useContext(DiscoverGridContext);
  const { toastNotifications } = useDiscoverServices();

  const buttonTitle = i18n.translate('discover.grid.copyClipboardButtonTitle', {
    defaultMessage: 'Copy value of {column}',
    values: { column: columnId },
  });

  return (
    <Component
      onClick={() => {
        copyValueToClipboard({
          rowIndex,
          columnId,
          toastNotifications,
          valueToStringConverter,
        });
      }}
      iconType="copyClipboard"
      aria-label={buttonTitle}
      title={buttonTitle}
      data-test-subj="copyClipboardButton"
    >
      {i18n.translate('discover.grid.copyButton', {
        defaultMessage: 'Copy',
      })}
    </Component>
  );
};

export function buildCellActions(field: DataViewField, onFilter?: DocViewFilterFn) {
  return [...(onFilter && field.filterable ? [FilterInBtn, FilterOutBtn] : []), CopyBtn];
}
