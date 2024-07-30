/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
  EuiScreenReaderOnly,
  EuiToolTip,
} from '@elastic/eui';
import { DataTableRowControl, Size } from '../../data_table_row_control';
import type { RowControlColumn, RowControlProps } from '../../../types';
import { DEFAULT_CONTROL_COLUMN_WIDTH } from '../../../constants';
import { useControlColumn } from '../../../hooks/use_control_column';

export const RowControlCell = ({
  renderControl,
  ...props
}: EuiDataGridCellValueElementProps & {
  renderControl: RowControlColumn['renderControl'];
}) => {
  const rowProps = useControlColumn(props);

  const Control: React.FC<RowControlProps> = useMemo(
    () =>
      ({ 'data-test-subj': dataTestSubj, color, disabled, label, iconType, onClick }) => {
        return (
          <DataTableRowControl size={Size.normal}>
            <EuiToolTip content={label} delay="long">
              <EuiButtonIcon
                data-test-subj={dataTestSubj ?? `unifiedDataTable_rowControl_${props.columnId}`}
                disabled={disabled}
                iconSize="s"
                iconType={iconType}
                color={color ?? 'text'}
                aria-label={label}
                onClick={() => {
                  onClick?.(rowProps);
                }}
              />
            </EuiToolTip>
          </DataTableRowControl>
        );
      },
    [props.columnId, rowProps]
  );

  return renderControl(Control, rowProps);
};

export const getRowControlColumn = (
  rowControlColumn: RowControlColumn
): EuiDataGridControlColumn => {
  const { id, headerAriaLabel, headerCellRender, renderControl } = rowControlColumn;

  return {
    id: `additionalRowControl_${id}`,
    width: DEFAULT_CONTROL_COLUMN_WIDTH,
    headerCellRender:
      headerCellRender ??
      (() => (
        <EuiScreenReaderOnly>
          <span>{headerAriaLabel}</span>
        </EuiScreenReaderOnly>
      )),
    rowCellRender: (props) => {
      return <RowControlCell {...props} renderControl={renderControl} />;
    },
  };
};
