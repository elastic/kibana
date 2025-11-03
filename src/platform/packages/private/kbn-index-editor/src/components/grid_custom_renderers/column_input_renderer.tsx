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
  useEuiTheme,
  findElementBySelectorOrRef,
  EuiPopover,
  EuiFormRow,
  EuiText,
  EuiSuperSelect,
  EuiHealth,
  EuiFlexGroup,
  EuiButton,
  EuiPopoverFooter,
} from '@elastic/eui';
import type { HTMLAttributes, KeyboardEvent } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { isPlaceholderColumn } from '../../utils';
import type { IndexUpdateService } from '../../index_update_service';
import { useAddColumnName, errorMessages } from '../../hooks/use_add_column_name';
import type { IndexEditorTelemetryService } from '../../telemetry/telemetry_service';

const COLUMN_INDEX_PROP = 'data-column-index';

const options = [
  {
    value: 'warning',
    inputDisplay: (
      <EuiHealth color="subdued" style={{ lineHeight: 'inherit' }}>
        Warning
      </EuiHealth>
    ),
    'data-test-subj': 'option-warning',
  },
  {
    value: 'minor',
    inputDisplay: (
      <EuiHealth color="warning" style={{ lineHeight: 'inherit' }}>
        Minor
      </EuiHealth>
    ),
    'data-test-subj': 'option-minor',
  },
  {
    value: 'critical',
    inputDisplay: (
      <EuiHealth color="danger" style={{ lineHeight: 'inherit' }}>
        Critical
      </EuiHealth>
    ),
    'data-test-subj': 'option-critical',
  },
];

export const getColumnInputRenderer = (
  columnName: string,
  columnIndex: number,
  isColumnInEditMode: boolean,
  setEditingColumnIndex: (columnIndex: number | null) => void,
  indexUpdateService: IndexUpdateService,
  telemetryService: IndexEditorTelemetryService
): ((props: CustomGridColumnProps) => EuiDataGridColumn) => {
  return ({ column }) => ({
    ...column,
    display: (
      <AddColumnHeader
        isColumnInEditMode={isColumnInEditMode}
        setEditingColumnIndex={setEditingColumnIndex}
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
      ],
    },
  });
};

interface AddColumnHeaderProps {
  isColumnInEditMode: boolean;
  setEditingColumnIndex: (columnIndex: number | null) => void;
  initialColumnName: string;
  columnIndex: number;
  telemetryService: IndexEditorTelemetryService;
}

export const AddColumnHeader = ({
  isColumnInEditMode,
  setEditingColumnIndex,
  initialColumnName,
  columnIndex,
  telemetryService,
}: AddColumnHeaderProps) => {
  const { euiTheme } = useEuiTheme();

  const [selectedType, setSelectedType] = useState(options[1].value);
  const canSubmit = true; // HD
  const { columnName, setColumnName, saveColumn, resetColumnName, validationError } =
    useAddColumnName(initialColumnName);

  const onBlur = useCallback(() => {
    if (columnName && !validationError) {
      saveColumn();
    } else {
      resetColumnName();
    }
    setEditingColumnIndex(null);
  }, [columnName, validationError, setEditingColumnIndex, saveColumn, resetColumnName]);

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (columnName && !validationError) {
        setEditingColumnIndex(null);
        saveColumn();
      } else {
        telemetryService.trackEditInteraction({
          actionType: 'add_column',
          failureReason: validationError || 'EMPTY_NAME',
        });
      }
    },
    [columnName, validationError, setEditingColumnIndex, saveColumn, telemetryService]
  );

  const columnLabel = isPlaceholderColumn(initialColumnName) ? (
    <FormattedMessage
      id="indexEditor.flyout.grid.columnHeader.add"
      defaultMessage="Add a column…"
    />
  ) : (
    initialColumnName
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

  const triggerButton = (
    <EuiButtonEmpty
      data-test-subj="indexEditorindexEditorColumnNameButton"
      aria-label={i18n.translate('indexEditor.columnHeaderEdit.aria', {
        defaultMessage: 'Edit column name',
      })}
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
      onClick={() => setEditingColumnIndex(columnIndex)}
    >
      {columnLabel}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      button={triggerButton}
      isOpen={isColumnInEditMode}
      closePopover={() => setEditingColumnIndex(null)}
      focusTrapProps={{
        noIsolation: false,
        clickOutsideDisables: false,
        onClickOutside: () => {},
        initialFocus: '#typeSelect',
        returnFocus,
      }}
      hasArrow={false}
    >
      <EuiForm component="form" onSubmit={onSubmit}>
        <EuiFormRow
          id="typeSelect"
          label={i18n.translate('indexEditor.columnHeaderEdit.fieldType', {
            defaultMessage: 'Select a field type',
          })}
          helpText={i18n.translate('indexEditor.columnHeaderEdit.fieldTypeHelpText', {
            defaultMessage: `You won't be able to change the type after saving it.`,
          })}
        >
          <EuiSuperSelect
            compressed
            valueOfSelected={selectedType}
            onChange={(value) => setSelectedType(value)}
            options={options}
          />
        </EuiFormRow>
        <EuiPopoverFooter>
          <EuiFormRow
            label={i18n.translate('indexEditor.columnHeaderEdit.columnNameLabel', {
              defaultMessage: 'Name',
            })}
            isInvalid={!!errorMessage}
            error={errorMessage}
          >
            <EuiFieldText
              isInvalid={!!errorMessage}
              data-test-subj="indexEditorindexEditorColumnNameInput"
              value={columnName}
              placeholder={i18n.translate('indexEditor.columnHeaderEdit.columnNamePlaceholder', {
                defaultMessage: 'Choose the name of the field',
              })}
              fullWidth
              controlOnly
              compressed
              onChange={(e) => {
                setColumnName(e.target.value);
              }}
              // onBlur={onBlur}
              onKeyDown={(e: KeyboardEvent) => {
                e.stopPropagation();

                if (e.key === 'Escape') {
                  e.preventDefault();
                  resetColumnName();
                  setEditingColumnIndex(null);
                }
              }}
            />
          </EuiFormRow>
          <EuiFlexGroup
            justifyContent="flexEnd"
            gutterSize="m"
            css={{ marginTop: euiTheme.size.l }}
          >
            <EuiButton color="text" size="s">
              <EuiText size="xs">
                <FormattedMessage
                  id="indexEditor.flyout.grid.columnHeader.cancelButton"
                  defaultMessage="Cancel"
                />
              </EuiText>
            </EuiButton>
            <EuiButton
              data-test-subj="indexEditorindexEditorColumnNameSaveButton"
              fill
              type="submit"
              disabled={!canSubmit}
              size="s"
            >
              <EuiText size="xs">
                <FormattedMessage
                  id="indexEditor.flyout.grid.columnHeader.saveButton"
                  defaultMessage="Save"
                />
              </EuiText>
            </EuiButton>
          </EuiFlexGroup>
        </EuiPopoverFooter>
      </EuiForm>
    </EuiPopover>
  );
};
