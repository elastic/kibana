/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
  RenderCellValue,
} from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import type { RowControlColumn } from '@kbn/discover-utils';
import { DEFAULT_CONTROL_COLUMN_WIDTH } from '../../../constants';
import { getAdditionalRowControlColumns } from '../additional_row_control';
import { ActionsHeader } from './actions_header';

const COLUMN_ID = 'actions';
const EXTERNAL_CONTROL_COLUMNS_SPACING = 4;

const HorizontalSpacer = () => <div css={{ paddingLeft: EXTERNAL_CONTROL_COLUMNS_SPACING }} />;

export const getActionsColumn = ({
  baseColumns,
  externalControlColumns,
  rowAdditionalLeadingControls,
}: {
  baseColumns: RenderCellValue[];
  rowAdditionalLeadingControls?: RowControlColumn[];
  externalControlColumns?: EuiDataGridControlColumn[];
}) => {
  if (
    !baseColumns.length &&
    !externalControlColumns?.length &&
    !rowAdditionalLeadingControls?.length
  ) {
    return null;
  }

  let columnWidth = baseColumns.length * DEFAULT_CONTROL_COLUMN_WIDTH;
  const actions = [...baseColumns];
  if (externalControlColumns?.length) {
    if (actions.length > 0) {
      actions.push(HorizontalSpacer);
      columnWidth += EXTERNAL_CONTROL_COLUMNS_SPACING;
    }

    actions.push(...externalControlColumns.map((column) => column.rowCellRender));
    columnWidth += externalControlColumns.reduce((acc, column) => acc + column.width, 0);
  }
  if (rowAdditionalLeadingControls?.length) {
    const { columns: additionalRowControlColumns, totalWidth } = getAdditionalRowControlColumns(
      rowAdditionalLeadingControls
    );
    actions.push(...additionalRowControlColumns);
    columnWidth += totalWidth;
  }

  return {
    id: COLUMN_ID,
    width: columnWidth,
    headerCellProps: { className: 'unifiedDataTable__headerCell' },
    rowCellRender: (props: EuiDataGridCellValueElementProps) => (
      <EuiFlexGroup
        data-test-subj="unifiedDataTable_actionsColumnCell"
        responsive={false}
        alignItems="center"
        gutterSize="none"
      >
        {actions.map((Action, idx) => (
          <Action key={idx} {...props} />
        ))}
      </EuiFlexGroup>
    ),
    headerCellRender: () => <ActionsHeader maxWidth={columnWidth} />,
  };
};
