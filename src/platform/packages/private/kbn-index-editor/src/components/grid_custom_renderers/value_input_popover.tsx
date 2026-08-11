/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { RefObject } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import type { EuiDataGridCellPopoverElementProps, EuiDataGridRefProps } from '@elastic/eui';
import { EuiToolTip } from '@elastic/eui';
import { EuiFocusTrap, EuiForm, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useUnmount from 'react-use/lib/useUnmount';
import { getInputComponentForType } from '../value_inputs_factory';
import { getCellValue, isPlaceholderColumn } from '../../utils';
import type { IndexEditorTelemetryService } from '../../telemetry/telemetry_service';

export type OnCellValueChange = (docId: string, update: any) => void;
export const getValueInputPopover =
  ({
    rows,
    columns,
    onValueChange,
    dataTableRef,
    telemetryService: telemetry,
  }: {
    rows: DataTableRecord[];
    columns: DatatableColumn[];
    onValueChange: OnCellValueChange;
    dataTableRef: RefObject<EuiDataGridRefProps>;
    telemetryService: IndexEditorTelemetryService;
  }) =>
  ({ rowIndex, colIndex, columnId, cellContentsElement }: EuiDataGridCellPopoverElementProps) => {
    const row = rows[rowIndex];
    const docId = row.id as string;
    const cellValue = getCellValue(row.flattened[columnId]) ?? '';

    const isPlaceholder = isPlaceholderColumn(columnId);

    let inputWidth: number | undefined;
    if (cellContentsElement) {
      inputWidth = cellContentsElement.offsetWidth - 8;
    }

    const [inputValue, setInputValue] = useState<string>(cellValue ?? '');
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
            telemetry.trackEditInteraction({
              actionType: 'edit_cell',
              failureReason: 'type',
            });
            event.preventDefault();
            return;
          }
        }
        if (event.key === 'Tab') {
          event.preventDefault();

          if (error) {
            telemetry.trackEditInteraction({
              actionType: 'edit_cell',
              failureReason: 'type',
            });
            return;
          }

          const dataTable = dataTableRef?.current;
          if (!dataTable) return;

          dataTable.closeCellPopover();

          // Calculate next cell position
          const nextColIndex = colIndex + 1;
          const nextRowIndex = nextColIndex > columns.length ? rowIndex + 1 : rowIndex;
          const finalColIndex = nextColIndex > columns.length ? 1 : nextColIndex;

          // Only navigate if there's a next row available
          if (nextRowIndex < rows.length) {
            requestAnimationFrame(() => {
              dataTable.openCellPopover({ rowIndex: nextRowIndex, colIndex: finalColIndex });
            });
          }
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          setInputValue(cellValue);
          setError(null);
          requestAnimationFrame(() => {
            dataTableRef?.current?.closeCellPopover();
          });
        }
      },
      [cellValue, colIndex, error, rowIndex]
    );

    const saveValue = useCallback(
      (newValue: string) => {
        if (!isPlaceholder && docId && newValue !== cellValue) {
          onValueChange(docId, { [columnId]: newValue });
        }
      },
      [isPlaceholder, docId, cellValue, columnId]
    );

    const closePopover = useCallback(
      (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (dataTableRef.current) {
          dataTableRef.current.closeCellPopover();
          requestAnimationFrame(() => {
            dataTableRef?.current?.setFocusedCell({ rowIndex, colIndex });
          });
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
          <EuiForm component="form" onSubmit={closePopover}>
            <EuiToolTip position="top" content={error}>
              <InputComponent
                data-test-subj="indexEditorCellValueInput"
                value={inputValue}
                aria-label={i18n.translate('indexEditor.indexEditorCellValueInput.aria', {
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
          announceOnMount
          size="s"
          title={i18n.translate('indexEditor.flyout.grid.cell.noColumnDefined', {
            defaultMessage: 'Define a field name before adding cell values',
          })}
        />
      );
    }
  };
