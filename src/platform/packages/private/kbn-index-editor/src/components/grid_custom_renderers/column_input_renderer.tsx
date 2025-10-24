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
import {
  EuiFieldText,
  EuiButtonEmpty,
  EuiForm,
  EuiToolTip,
  useEuiTheme,
  EuiFocusTrap,
  findElementBySelectorOrRef,
} from '@elastic/eui';
import type { HTMLAttributes, KeyboardEvent } from 'react';
import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { isPlaceholderColumn } from '../../utils';
import type { IndexUpdateService } from '../../index_update_service';
import { useAddColumnName, errorMessages } from '../../hooks/use_add_column_name';
import type { IndexEditorTelemetryService } from '../../telemetry/telemetry_service';

const COLUMN_INDEX_PROP = 'data-header-index';

export const getColumnInputRenderer = (
  columnName: string,
  columnIndex: number,
  editMode: boolean,
  setEditMode: (columnIndex: number | null) => void,
  indexUpdateService: IndexUpdateService,
  telemetryService: IndexEditorTelemetryService
): ((props: CustomGridColumnProps) => EuiDataGridColumn) => {
  return ({ column }) => ({
    ...column,
    display: (
      <AddColumnHeader
        editMode={editMode}
        setEditMode={setEditMode}
        initialColumnName={columnName}
        columnIndex={columnIndex}
        telemetryService={telemetryService}
      />
    ),
    displayHeaderCellProps: { [COLUMN_INDEX_PROP]: columnIndex } as HTMLAttributes<HTMLDivElement>,
    actions: {
      showHide: false,
      showSortAsc: false,
      showSortDesc: false,
      showMoveLeft: false,
      showMoveRight: false,
      additional: [
        {
          'data-test-subj': 'indexEditorindexEditorEditColumnButton',
          label: (
            <FormattedMessage
              id="indexEditor.flyout.grid.columnHeader.editAction"
              defaultMessage="Edit name"
            />
          ),
          size: 'xs',
          iconType: 'pencil',
          onClick: () => {
            setEditMode(columnIndex);
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
      ],
    },
  });
};

interface AddColumnHeaderProps {
  editMode: boolean;
  setEditMode: (columnIndex: number | null) => void;
  initialColumnName: string;
  columnIndex: number;
  telemetryService: IndexEditorTelemetryService;
}

export const AddColumnHeader = ({
  editMode,
  setEditMode,
  initialColumnName,
  columnIndex,
  telemetryService,
}: AddColumnHeaderProps) => {
  const { euiTheme } = useEuiTheme();
  const { columnName, setColumnName, saveColumn, resetColumnName, validationError } =
    useAddColumnName(initialColumnName);

  const onBlur = useCallback(() => {
    if (columnName && !validationError) {
      saveColumn();
    } else {
      resetColumnName();
    }
    setEditMode(null);
  }, [columnName, validationError, setEditMode, saveColumn, resetColumnName]);

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (columnName && !validationError) {
        setEditMode(null);
        saveColumn();
      } else {
        telemetryService.trackEditInteraction({
          actionType: 'add_column',
          failureReason: validationError || 'EMPTY_NAME',
        });
      }
    },
    [columnName, validationError, setEditMode, saveColumn, telemetryService]
  );

  const columnLabel = isPlaceholderColumn(initialColumnName) ? (
    <FormattedMessage
      id="indexEditor.flyout.grid.columnHeader.add"
      defaultMessage="Add a column…"
    />
  ) : (
    columnName
  );

  const errorMessage = useMemo(() => {
    if (!validationError) return;
    return errorMessages[validationError]
      ? errorMessages[validationError](columnName)
      : validationError;
  }, [validationError, columnName]);

  const returnFocus = useCallback(() => {
    requestAnimationFrame(() => {
      const headerWrapper = findElementBySelectorOrRef(`[${COLUMN_INDEX_PROP}="${columnIndex}"]`);

      if (headerWrapper) {
        headerWrapper.focus();
      }
    });

    return false;
  }, [columnIndex]);

  if (editMode) {
    return (
      <EuiFocusTrap initialFocus="input" returnFocus={returnFocus}>
        <EuiForm component="form" onSubmit={onSubmit}>
          <EuiToolTip
            position="top"
            content={errorMessage}
            anchorProps={{ css: { width: '100%' } }}
          >
            <EuiFieldText
              data-test-subj="indexEditorindexEditorColumnNameInput"
              value={columnName}
              fullWidth
              controlOnly
              compressed
              onChange={(e) => {
                setColumnName(e.target.value);
              }}
              onBlur={onBlur}
              onKeyDown={(e: KeyboardEvent) => {
                e.stopPropagation();

                if (e.key === 'Escape') {
                  e.preventDefault();
                  resetColumnName();
                  setEditMode(null);
                }
              }}
              css={{
                '&:focus-within': {
                  outline: 'none',
                },
              }}
            />
          </EuiToolTip>
        </EuiForm>
      </EuiFocusTrap>
    );
  }

  return (
    <EuiButtonEmpty
      data-test-subj="indexEditorindexEditorColumnNameButton"
      aria-label="Edit column name"
      css={{
        color: euiTheme.colors.textSubdued,
        width: '100%',
        height: euiTheme.size.xl,
      }}
      tabIndex={-1}
      flush="left"
      contentProps={{
        css: {
          justifyContent: 'left',
        },
      }}
      onClick={() => setEditMode(columnIndex)}
    >
      {columnLabel}
    </EuiButtonEmpty>
  );
};
