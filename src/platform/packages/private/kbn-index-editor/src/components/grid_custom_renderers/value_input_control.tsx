/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FunctionComponent, useCallback, RefObject, useEffect, useRef } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiDataGridCellPopoverElementProps,
  EuiCallOut,
  EuiFocusTrap,
  EuiForm,
} from '@elastic/eui';
import { type EuiDataGridRefProps } from '@kbn/unified-data-table';
import { type DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { DataTableRecord } from '@kbn/discover-utils';
import { isNil } from 'lodash';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { isPlaceholderColumn } from '../../utils';
import type { PendingSave } from '../../index_update_service';
import { ValueInput } from '../value_input';

export type OnCellValueChange = (docId: string, update: any) => void;

export const getValueInputPopover =
  ({
    rows,
    columns,
    onValueChange,
    savingDocs,
    dataTableRef,
  }: {
    rows: DataTableRecord[];
    columns: DatatableColumn[];
    onValueChange: OnCellValueChange;
    savingDocs: PendingSave | undefined;
    dataTableRef: RefObject<EuiDataGridRefProps>;
  }) =>
  ({ rowIndex, colIndex, columnId, cellContentsElement }: EuiDataGridCellPopoverElementProps) => {
    const row = rows[rowIndex];
    const docId = row.raw._id;

    const cellValue = row.flattened[columnId]?.toString() ?? savingDocs?.get(docId)?.[columnId];

    const editedValue = useRef(cellValue);

    const saveValue = useCallback(
      (newValue: string) => {
        if (docId && newValue !== cellValue) {
          onValueChange(docId, { [columnId]: editedValue.current });
        }
      },
      [docId, columnId, cellValue]
    );

    const onSubmit = useCallback(
      (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        saveValue(editedValue.current);

        if (dataTableRef.current) {
          dataTableRef.current.closeCellPopover();

          // Cell needs to be focused again after popover close,
          // Also focus must be put in another cell first for it to work.
          dataTableRef.current.setFocusedCell({ rowIndex: 0, colIndex: 0 });
          dataTableRef.current.setFocusedCell({ rowIndex, colIndex });
        }
      },
      [saveValue, rowIndex, colIndex]
    );

    // Update the value when the user navigates away from the cell
    useEffect(() => {
      return () => {
        saveValue(editedValue.current);
      };
    }, [columnId, docId, saveValue]);

    const isPlaceholder = isPlaceholderColumn(columnId);

    let inputWidth: number | undefined;
    if (cellContentsElement) {
      inputWidth = cellContentsElement.offsetWidth;
    }

    if (!isPlaceholder) {
      return (
        <EuiFocusTrap autoFocus={true} initialFocus="input">
          <EuiForm component="form" onSubmit={onSubmit}>
            <ValueInput
              columnName={columnId}
              columns={columns}
              value={cellValue}
              width={inputWidth}
              onChange={(value) => {
                editedValue.current = value;
              }}
            />
          </EuiForm>
        </EuiFocusTrap>
      );
    } else {
      return (
        <EuiCallOut
          size="s"
          title={i18n.translate('indexEditor.flyout.grid.cell.noColumnDefined', {
            defaultMessage: 'Name the field before adding cell values',
          })}
        />
      );
    }
  };

export const getCellValueRenderer =
  (
    rows: DataTableRecord[],
    savingDocs: PendingSave | undefined,
    dataTableRef: RefObject<EuiDataGridRefProps>,
    isIndexCreated: boolean
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
            css={{
              cursor: 'pointer',
              height: '100%',
              width: '100%',
            }}
            onClick={onEditStartHandler}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEditStartHandler();
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
                `${cellValue}`
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
