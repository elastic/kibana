/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
  EuiFlexGroup,
  RenderCellValue,
} from '@elastic/eui';
import React from 'react';
import type { RowControlColumn } from '@kbn/discover-utils';
import { DEFAULT_CONTROL_COLUMN_WIDTH } from '../../../constants';
import { getAdditionalRowControlColumns } from '../additional_row_control';
import { ActionsHeader } from './actions_header';

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
  const extraColumns = [...baseColumns];
  if (externalControlColumns) {
    extraColumns.push(...externalControlColumns.map((column) => column.rowCellRender));
    columnWidth += externalControlColumns.reduce((acc, column) => acc + column.width, 0);
  }
  if (rowAdditionalLeadingControls?.length) {
    const additionalRowControColumns = getAdditionalRowControlColumns(rowAdditionalLeadingControls);
    extraColumns.push(...additionalRowControColumns.map((column) => column.rowCellRender));
    columnWidth += DEFAULT_CONTROL_COLUMN_WIDTH * additionalRowControColumns.length;
  }

  const gutterSize = 4 * (extraColumns.length - 1);
  columnWidth += gutterSize;

  return {
    id: 'actions',
    width: columnWidth,
    rowCellRender: (props: EuiDataGridCellValueElementProps) => (
      <EuiFlexGroup data-test-subj="actions-control-column" alignItems="center" gutterSize="xs">
        {extraColumns.map((Content, idx) => (
          <Content key={idx} {...props} />
        ))}
      </EuiFlexGroup>
    ),
    headerCellRender: () => <ActionsHeader maxWidth={columnWidth} />,
  };
};
