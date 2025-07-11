/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FunctionComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { type DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { DataTableRecord } from '@kbn/discover-utils';
import { isNil } from 'lodash';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { IndexEditorMode } from '../types';
import type { PendingSave } from '../index_update_service';
import { ValueInput } from './value_input';

export type OnCellValueChange = (docId: string, update: any) => void;

export const getCellValueRenderer =
  (
    rows: DataTableRecord[],
    columns: DatatableColumn[],
    editingCell: { row: number | null; col: string | null },
    savingDocs: PendingSave | undefined,
    onEditStart: (update: { row: number | null; col: string | null }) => void,
    onValueChange: OnCellValueChange,
    indexEditorMode: IndexEditorMode
  ): FunctionComponent<DataGridCellValueElementProps> =>
  ({ rowIndex, columnId }) => {
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

    const isEditing = editingCell.row === rowIndex && editingCell.col === columnId;

    if (isEditing) {
      return (
        <div style={{ display: 'flex', height: '100%' }}>
          <ValueInput
            onBlur={() => {
              onEditStart({ row: null, col: null });
            }}
            onEnter={(value) => {
              onValueChange(docId!, { [columnId]: value });
            }}
            columnName={columnId}
            columns={columns}
            value={cellValue}
            autoFocus
          />
        </div>
      );
    }

    const onEditStartHandler = () => {
      if (!columns.some((col) => col.id === columnId)) {
        // If the column is not defined, do not start editing
        return;
      }
      onEditStart({ row: rowIndex, col: columnId });
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
              if (e.key === 'Enter') onEditStartHandler();
            }}
          >
            {cellValue}
          </div>
        </EuiFlexItem>
        {isPendingToBeSaved && indexEditorMode === 'edition' ? (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="s" />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  };
