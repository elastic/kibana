/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiDataGridColumn } from '@elastic/eui';
import type { CustomGridColumnProps } from '@kbn/unified-data-table';
import type { HTMLAttributes } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IndexUpdateService } from '../../index_update_service';
import type { IndexEditorTelemetryService } from '../../telemetry/telemetry_service';
import { ColumnHeaderPopover, COLUMN_INDEX_PROP } from './column_header_popover';

export const getColumnHeaderRenderer = (
  columnName: string,
  columnType: string | undefined,
  columnIndex: number,
  isSavedColumn: boolean,
  isColumnInEditMode: boolean,
  setEditingColumnIndex: (columnIndex: number | null) => void,
  indexUpdateService: IndexUpdateService,
  telemetryService: IndexEditorTelemetryService
): ((props: CustomGridColumnProps) => EuiDataGridColumn) => {
  return ({ column }) => ({
    ...column,
    display: (
      <ColumnHeaderPopover
        isColumnInEditMode={isColumnInEditMode}
        setEditingColumnIndex={setEditingColumnIndex}
        isSavedColumn={isSavedColumn}
        initialColumnName={columnName}
        initialColumnType={columnType}
        columnIndex={columnIndex}
        telemetryService={telemetryService}
        originalColumnDisplay={column.display}
      />
    ),
    displayHeaderCellProps: { [COLUMN_INDEX_PROP]: columnIndex } as HTMLAttributes<HTMLDivElement>,
    actions: {
      showHide: false,
      showSortAsc: false,
      showSortDesc: false,
      showMoveLeft: false,
      showMoveRight: false,
      additional: !isSavedColumn
        ? [
            {
              'data-test-subj': 'indexEditorindexEditorEditColumnButton',
              label: (
                <FormattedMessage
                  id="indexEditor.flyout.grid.columnHeader.editAction"
                  defaultMessage="Edit column"
                />
              ),
              size: 'xs',
              iconType: 'pencil',
              onClick: () => {
                setEditingColumnIndex(columnIndex);
              },
            },
            {
              'data-test-subj': 'indexEditorindexEditorDeleteColumnButton',
              label: (
                <FormattedMessage
                  id="indexEditor.flyout.grid.columnHeader.deleteAction"
                  defaultMessage="Delete column and values"
                />
              ),
              size: 'xs',
              iconType: 'trash',
              onClick: () => {
                indexUpdateService.deleteColumn(columnName);
              },
            },
          ]
        : [],
    },
  });
};
