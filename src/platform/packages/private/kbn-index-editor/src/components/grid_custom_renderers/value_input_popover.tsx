/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataTableRecord } from '@kbn/discover-utils';
import { DatatableColumn } from '@kbn/expressions-plugin/common';
import React, { RefObject, useCallback, useMemo, useState } from 'react';
import { EuiDataGridCellPopoverElementProps, EuiDataGridRefProps, EuiToolTip } from '@elastic/eui';
import { EuiFocusTrap, EuiForm, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useUnmount from 'react-use/lib/useUnmount';
import { getInputComponentForType } from '../value_inputs_factory';
import { PendingSave } from '../../index_update_service';
import { isPlaceholderColumn } from '../../utils';

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

    const isPlaceholder = isPlaceholderColumn(columnId);

    let inputWidth: number | undefined;
    if (cellContentsElement) {
      inputWidth = cellContentsElement.offsetWidth;
    }

    const [inputValue, setInputValue] = useState(cellValue ?? '');
    const [error, setError] = useState<string | null>(null);

    const columnType = useMemo(() => {
      if (!columns || !columnId) return;
      const col = columns.find((c) => c.name === columnId);
      return col?.meta?.type;
    }, [columnId]);

    const InputComponent = useMemo(() => {
      return getInputComponentForType(columnType);
    }, [columnType]);

    const onKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          if (error) {
            event.preventDefault();
            return;
          }
        }
        if (event.key === 'Escape') {
          setInputValue(cellValue);
          setError(null);
        }
      },
      [cellValue, error]
    );

    const saveValue = useCallback(
      (newValue: string) => {
        if (!isPlaceholder && docId && newValue !== cellValue) {
          onValueChange(docId, { [columnId]: newValue });
        }
      },
      [isPlaceholder, docId, cellValue, columnId]
    );

    const onSubmit = useCallback(
      (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (dataTableRef.current) {
          dataTableRef.current.closeCellPopover();

          // Cell needs to be focused again after popover close,
          // Also focus must be put in another cell first for it to work.
          dataTableRef.current.setFocusedCell({ rowIndex: 0, colIndex: 0 });
          dataTableRef.current.setFocusedCell({ rowIndex, colIndex });
        }

        // Value is saved on component unmount
      },
      [rowIndex, colIndex]
    );

    // Update the value when the user navigates away from the cell
    useUnmount(() => {
      saveValue(inputValue);
    });

    if (!isPlaceholder) {
      return (
        <EuiFocusTrap autoFocus={true} initialFocus="input">
          <EuiForm component="form" onSubmit={onSubmit}>
            <EuiToolTip position="top" content={error}>
              <InputComponent
                value={inputValue}
                aria-label={i18n.translate('indexEditor.cellValueInput.aria', {
                  defaultMessage: 'Value for {columnId}',
                  values: { columnId },
                })}
                onChange={(e) => {
                  setInputValue(e.target.value);
                }}
                onError={setError}
                onKeyDown={onKeyDown}
                css={{ width: inputWidth }}
              />
            </EuiToolTip>
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
