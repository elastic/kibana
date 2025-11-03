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
  EuiFlexGroup,
  EuiButton,
  EuiPopoverFooter,
} from '@elastic/eui';
import type { HTMLAttributes, PropsWithChildren } from 'react';
import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
import { isPlaceholderColumn } from '../../utils';
import type { IndexUpdateService } from '../../index_update_service';
import { useAddColumnName, errorMessages } from '../../hooks/use_add_column_name';
import type { IndexEditorTelemetryService } from '../../telemetry/telemetry_service';

const COLUMN_INDEX_PROP = 'data-column-index';

const options = [
  {
    value: 'number',
    inputDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false}>
        <FieldIcon type="number" label="Integer" />
        <span>Number</span>
      </EuiFlexGroup>
    ),
  },
  {
    value: 'keyword',
    inputDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false}>
        <FieldIcon type="keyword" label="Keyword" />
        <span>Keyword</span>
      </EuiFlexGroup>
    ),
  },
  {
    value: 'text',
    inputDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false}>
        <FieldIcon type="text" label="Text" />
        <span>Text</span>
      </EuiFlexGroup>
    ),
  },
  {
    value: 'boolean',
    inputDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false}>
        <FieldIcon type="boolean" label="Boolean" />
        <span>Boolean</span>
      </EuiFlexGroup>
    ),
  },
];

export const getColumnInputRenderer = (
  columnName: string,
  columnType: string | undefined,
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
      additional: [
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
      ],
    },
  });
};

interface AddColumnHeaderProps {
  isColumnInEditMode: boolean;
  setEditingColumnIndex: (columnIndex: number | null) => void;
  initialColumnName: string;
  initialColumnType: string | undefined;
  columnIndex: number;
  telemetryService: IndexEditorTelemetryService;
  originalColumnDisplay: React.ReactNode;
}

export const AddColumnHeader = ({
  isColumnInEditMode,
  setEditingColumnIndex,
  initialColumnName,
  initialColumnType,
  columnIndex,
  telemetryService,
  originalColumnDisplay,
}: PropsWithChildren<AddColumnHeaderProps>) => {
  const { euiTheme } = useEuiTheme();

  const { columnType, setColumnType, columnName, setColumnName, saveColumn, validationError } =
    useAddColumnName(initialColumnName, initialColumnType);

  const canSubmit = columnType && columnName.length > 0 && !validationError;

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
    originalColumnDisplay // The default column header display comming from UnifiedDataTable, the type icon + column name
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
            valueOfSelected={columnType}
            placeholder={i18n.translate('indexEditor.columnHeaderEdit.selectATypePlaceholder', {
              defaultMessage: 'Select option',
            })}
            id="typeSelect"
            data-test-subj="indexEditorindexEditorColumnTypeSelect"
            onChange={(value) => setColumnType(value)}
            options={options}
          />
        </EuiFormRow>
        {columnType && (
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
              />
            </EuiFormRow>
            <EuiFlexGroup
              justifyContent="flexEnd"
              gutterSize="m"
              css={{ marginTop: euiTheme.size.l }}
            >
              <EuiButton color="text" size="s" onClick={() => setEditingColumnIndex(null)}>
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
        )}
      </EuiForm>
    </EuiPopover>
  );
};
