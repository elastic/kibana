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
import type { KeyboardEvent } from 'react';
import React, { useState, useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { isPlaceholderColumn } from '../../utils';
import type { IndexUpdateService } from '../../index_update_service';
import { useAddColumnName, errorMessages } from '../../hooks/use_add_column_name';
import type { IndexEditorTelemetryService } from '../../telemetry/telemetry_service';

const HEADER_INDEX_PROP = 'data-header-index';

export const getColumnInputRenderer = (
  columnName: string,
  columnIndex: number,
  indexUpdateService: IndexUpdateService,
  telemetryService: IndexEditorTelemetryService
): ((props: CustomGridColumnProps) => EuiDataGridColumn) => {
  return ({ column }) => ({
    ...column,
    display: (
      <AddColumnHeader
        initialColumnName={columnName}
        columnIndex={columnIndex}
        telemetryService={telemetryService}
      />
    ),
    displayHeaderCellProps: { [HEADER_INDEX_PROP]: columnIndex },
    actions: {
      showHide: false,
      additional: [
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
  initialColumnName: string;
  columnIndex: number;
  telemetryService: IndexEditorTelemetryService;
}

export const AddColumnHeader = ({
  initialColumnName,
  columnIndex,
  telemetryService,
}: AddColumnHeaderProps) => {
  const { columnName, setColumnName, saveColumn, resetColumnName, validationError } =
    useAddColumnName(initialColumnName);

  const [isEditing, setIsEditing] = useState(false);

  const onBlur = useCallback(() => {
    // if (columnName && !validationError) {
    //   saveColumn();
    // } else {
    //   resetColumnName();
    // }
    // setIsEditing(false);
  }, [columnName, validationError, saveColumn, resetColumnName]);

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      // event.stopPropagation();

      if (columnName && !validationError) {
        setIsEditing(false);
        saveColumn();
        // requestAnimationFrame(() => {
        //   const input = findElementBySelectorOrRef(
        //     `[${HEADER_INDEX_PROP}="${columnIndex}"]`
        //   ) as HTMLInputElement;
        //   console.log('input', input);
        //   if (input) {
        //     input.focus();
        //   }
        // });
      } else {
        telemetryService.trackEditInteraction({
          actionType: 'add_column',
          failureReason: validationError || 'EMPTY_NAME',
        });
      }
    },
    [columnName, columnIndex, validationError, saveColumn, telemetryService]
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

  if (true) {
    console.log('isEditing', isEditing);
    return (
      // <EuiFocusTrap disabled={!isEditing} autoFocus={false}>
      <EuiForm component="form" onSubmit={onSubmit} tabIndex={-1}>
        <EuiToolTip position="top" content={errorMessage} anchorProps={{ css: { width: '100%' } }}>
          <EuiFieldText
            data-test-subj="indexEditorindexEditorColumnNameInput"
            value={columnName}
            // autoFocus
            fullWidth
            controlOnly
            compressed
            disabled={!isEditing}
            // tabIndex={-1}
            onFocus={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('on focus', e);
              // setIsEditing(true);
            }}
            onChange={(e) => {
              setColumnName(e.target.value);
            }}
            onBlur={onBlur}
            onKeyDown={(e: KeyboardEvent) => {
              // e.stopPropagation();

              if (e.key === 'Enter') {
                e.preventDefault();
                setIsEditing(false);
                return;
              }
              // e.stopPropagation();
              if (e.key === 'Escape') {
                e.preventDefault();
                resetColumnName();
                setIsEditing(false);
              }
            }}
            css={{
              outline: 'none',
              '&:focus-within': {
                outline: 'none',
              },
            }}
          />
        </EuiToolTip>
      </EuiForm>
      // </EuiFocusTrap>
    );
  }

  // return (
  //   <EuiButtonEmpty
  //     data-test-subj="indexEditorindexEditorColumnNameButton"
  //     aria-label="Edit column name"
  //     css={{
  //       color: euiTheme.colors.textSubdued,
  //       width: '100%',
  //       height: euiTheme.size.xl,
  //     }}
  //     flush="left"
  //     contentProps={{
  //       css: {
  //         justifyContent: 'left',
  //       },
  //     }}
  //     onClick={() => setIsEditing(true)}
  //     onKeyDown={(e: KeyboardEvent) => {
  //       e.preventDefault();
  //       e.stopPropagation();
  //       if (e.key === 'Enter') {
  //         setIsEditing(true);
  //       }
  //     }}
  //   >
  //     {columnLabel}
  //   </EuiButtonEmpty>
  // );
};
