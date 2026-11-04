/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FunctionComponent, type RefObject } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { type EuiDataGridRefProps } from '@kbn/unified-data-table';
import { type DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { DataTableRecord } from '@kbn/discover-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { getCellValue } from '../../utils';

/** How the editable cell popover is opened: a single click (default) or a double click. */
export type CellEditTrigger = 'onClick' | 'onDoubleClick';

export const getCellValueRenderer =
  (
    rows: DataTableRecord[],
    dataTableRef: RefObject<EuiDataGridRefProps>,
    canEditIndex: boolean,
    trigger: CellEditTrigger = 'onClick',
    // Resolves the value to display, letting hosts overlay unsaved edits. Defaults to the fetched value.
    getDisplayValue?: (row: DataTableRecord, columnId: string) => unknown
  ): FunctionComponent<DataGridCellValueElementProps> =>
  ({ rowIndex, colIndex, columnId }) => {
    const row = rows[rowIndex];
    const cellValue = getCellValue(
      getDisplayValue ? getDisplayValue(row, columnId) : row.flattened[columnId]
    );

    const onEditStartHandler = () => {
      dataTableRef.current?.openCellPopover({
        rowIndex,
        colIndex,
      });
    };

    const triggerHandler = canEditIndex ? { [trigger]: onEditStartHandler } : {};

    return (
      <EuiFlexGroup gutterSize="s" responsive={false} style={{ height: '100%', width: '100%' }}>
        <EuiFlexItem css={{ width: '100%' }}>
          <div
            data-test-subj={`indexEditorCellValue-${rowIndex}-${colIndex}`}
            css={{
              cursor: canEditIndex ? 'pointer' : 'inherit',
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
            }}
            {...triggerHandler}
            onKeyDown={
              canEditIndex
                ? (e) => {
                    if (e.key === 'Enter') onEditStartHandler();
                  }
                : undefined
            }
          >
            {
              // Only check for undefined, other falsy values might be user inputs
              cellValue === undefined ? (
                canEditIndex ? (
                  <EuiText size="xs" color="subdued">
                    <FormattedMessage
                      id="indexEditor.flyout.grid.cell.default"
                      defaultMessage="Add value…"
                    />
                  </EuiText>
                ) : null
              ) : (
                <EuiText
                  size="xs"
                  title={cellValue}
                  css={{ overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}
                >
                  {cellValue}
                </EuiText>
              )
            }
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };
