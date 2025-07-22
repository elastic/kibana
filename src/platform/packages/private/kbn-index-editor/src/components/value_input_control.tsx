/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FunctionComponent, useCallback, RefObject } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiDataGridCellPopoverElementProps,
  EuiCallOut,
} from '@elastic/eui';
import { type EuiDataGridRefProps } from '@kbn/unified-data-table';
import { type DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { DataTableRecord } from '@kbn/discover-utils';
import { isNil } from 'lodash';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { PendingSave } from '../index_update_service';
import { ValueInput } from './value_input';

export type OnCellValueChange = (docId: string, update: any) => void;

export const getValueInputPopover =
  ({
    rows,
    columns,
    onValueChange,
    dataTableRef,
  }: {
    rows: DataTableRecord[];
    columns: DatatableColumn[];
    onValueChange: OnCellValueChange;
    dataTableRef: RefObject<EuiDataGridRefProps>;
  }) =>
  ({ columnId, rowIndex, colIndex, cellContentsElement }: EuiDataGridCellPopoverElementProps) => {
    const row = rows[rowIndex];
    const docId = row.raw._id;
    const cellValue = row.flattened[columnId]?.toString();

    const onEnter = useCallback(
      (value: string) => {
        onValueChange(docId!, { [columnId]: value });

        dataTableRef.current?.closeCellPopover();
        // Cell needs to be focused again after popover close,
        // also focus must be put in another cell first for it to work.
        dataTableRef.current?.setFocusedCell({ rowIndex: 0, colIndex: 0 });
        dataTableRef.current?.setFocusedCell({ rowIndex, colIndex });
      },
      [docId, columnId, rowIndex, colIndex]
    );

    const columnExists = columns.some((col) => col.id === columnId);

    let inputWidth: number | undefined;
    if (cellContentsElement) {
      inputWidth = cellContentsElement.getBoundingClientRect().width;
    }

    if (columnExists) {
      return (
        <ValueInput
          onEnter={onEnter}
          columnName={columnId}
          columns={columns}
          value={cellValue}
          autoFocus
          width={inputWidth}
        />
      );
    } else {
      return (
        <EuiCallOut
          size="s"
          title={i18n.translate('indexEditor.flyout.grid.cell.noColumnDefined', {
            defaultMessage: 'You must name the field before adding cell values.',
          })}
        />
      );
    }
  };

export const getCellValueRenderer =
  (
    rows: DataTableRecord[],
    savingDocs: PendingSave | undefined,
    isIndexCreated: boolean,
    dataTableRef: RefObject<EuiDataGridRefProps>
  ): FunctionComponent<DataGridCellValueElementProps> =>
  ({ rowIndex, colIndex, columnId }) => {
    const row = rows[rowIndex];
    const docId = row.raw._id;

    const pendingSaveValue = savingDocs?.get(docId)?.[columnId];

    let cellValue;

    const isPendingToBeSaved = !isNil(pendingSaveValue);

    if (isPendingToBeSaved) {
      // If there is a pending save, use the value from the pending save
      cellValue = pendingSaveValue;
    } else if (row.flattened) {
      // Otherwise, use the value from the row
      cellValue = row.flattened[columnId]?.toString();
    }

    const onEditStartHandler = () => {
      dataTableRef.current?.openCellPopover({
        rowIndex,
        colIndex,
      });
    };

    return (
      <EuiFlexGroup gutterSize="s" responsive={false} style={{ height: '100%', width: '100%' }}>
        <EuiFlexItem>
          <div
            tabIndex={0}
            style={{
              cursor: 'pointer',
              height: '100%',
              width: '100%',
            }}
            onClick={onEditStartHandler}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onEditStartHandler();
              }
            }}
            css={{
              height: '100%',
              width: '100%',
            }}
          >
            {
              // Only check for undefined, other falsy values might be user inputs
              cellValue === undefined ? (
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="indexEditor.flyout.grid.cell.default"
                    defaultMessage="Add value…"
                  />
                </EuiText>
              ) : (
                cellValue
              )
            }
          </div>
        </EuiFlexItem>
        {isPendingToBeSaved && isIndexCreated ? (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="s" />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  };
