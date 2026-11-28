/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiDataGridCellValueElementProps, RenderCellValue } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import React, { useContext } from 'react';
import { DEFAULT_CONTROL_COLUMN_WIDTH } from '../../../constants';
import { UnifiedDataTableContext } from '../../../table_context';
import {
  getAdditionalRowControlColumns,
  type AdditionalRowControlsLayout,
} from '../additional_row_control';
import { ActionsHeader } from './actions_header';

const COLUMN_ID = 'actions';

const ActionsCell = ({
  actions,
  ...props
}: EuiDataGridCellValueElementProps & { actions: RenderCellValue[] }) => {
  const { getRowByIndex } = useContext(UnifiedDataTableContext);
  const record = getRowByIndex(props.rowIndex);

  // The grid reuses cells by position, so keying by document resets the controls' local
  // state (e.g. an open menu) when a different document takes this row. Some consumers set
  // `id` to the bare `_id`, which is only unique within an index.
  return (
    <EuiFlexGroup
      key={record && [record.raw._index, record.id].join('::')}
      data-test-subj="unifiedDataTable_actionsColumnCell"
      responsive={false}
      alignItems="center"
      gutterSize="none"
    >
      {actions.map((Action, idx) => (
        <Action key={idx} {...props} />
      ))}
    </EuiFlexGroup>
  );
};

/**
 * Builds the actions column. Its cells depend only on `baseColumns` and the row controls
 * layout, so callers should rebuild it only when those change: a rebuilt column remounts
 * every actions cell and loses its state.
 */
export const getActionsColumn = ({
  baseColumns,
  rowControlsLayout,
}: {
  baseColumns: RenderCellValue[];
  rowControlsLayout?: AdditionalRowControlsLayout;
}) => {
  if (!baseColumns.length && !rowControlsLayout?.numInlineSlots) {
    return null;
  }

  let columnWidth = baseColumns.length * DEFAULT_CONTROL_COLUMN_WIDTH;
  const actions = [...baseColumns];
  if (rowControlsLayout?.numInlineSlots) {
    actions.push(...getAdditionalRowControlColumns(rowControlsLayout));
    columnWidth += rowControlsLayout.totalWidth;
  }

  return {
    id: COLUMN_ID,
    width: columnWidth,
    headerCellProps: { className: 'unifiedDataTable__headerCell' },
    rowCellRender: (props: EuiDataGridCellValueElementProps) => (
      <ActionsCell {...props} actions={actions} />
    ),
    headerCellRender: () => <ActionsHeader maxWidth={columnWidth} />,
  };
};
