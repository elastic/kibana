/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useEffect, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
  EuiScreenReaderOnly,
  EuiToolTip,
} from '@elastic/eui';
import { UnifiedDataTableContext } from '../../../table_context';
import { DataTableRowControl } from '../../data_table_row_control';
import { RowControlColumn, RowControlRowProps, RowControlProps } from '../../../types';

export const RowControlCell = ({
  columnId,
  rowIndex,
  setCellProps,
  renderControl,
}: EuiDataGridCellValueElementProps & {
  renderControl: RowControlColumn['renderControl'];
}) => {
  const { expanded, rows, isDarkMode } = useContext(UnifiedDataTableContext);
  const record = useMemo(() => rows[rowIndex], [rows, rowIndex]);
  const rowProps: RowControlRowProps = useMemo(() => ({ rowIndex, record }), [rowIndex, record]);

  useEffect(() => {
    if (record.isAnchor) {
      setCellProps({
        className: 'unifiedDataTable__cell--highlight',
      });
    } else if (expanded && record && expanded.id === record.id) {
      setCellProps({
        className: 'unifiedDataTable__cell--expanded',
      });
    }
  }, [expanded, record, setCellProps, isDarkMode]);

  const Control: React.FC<RowControlProps> = useMemo(
    () =>
      ({ 'data-test-subj': dataTestSubj, color, disabled, label, iconType, onClick }) => {
        return (
          <DataTableRowControl>
            <EuiToolTip content={label} delay="long">
              <EuiButtonIcon
                data-test-subj={dataTestSubj ?? `unifiedDataTable_rowControl_${columnId}`}
                disabled={disabled}
                size="xs"
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
    [columnId, rowProps]
  );

  return renderControl(Control, rowProps);
};

export const getRowControlColumn = (
  rowControlColumn: RowControlColumn
): EuiDataGridControlColumn => {
  const { id, headerAriaLabel, headerCellRender, renderControl } = rowControlColumn;

  return {
    id: `additionalRowControl_${id}`,
    width: 24,
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
