/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  useEuiTheme,
  findElementBySelectorOrRef,
  EuiButtonEmpty,
  EuiPopover,
  EuiForm,
  EuiFormRow,
  EuiPopoverFooter,
  EuiFieldText,
  EuiFlexGroup,
  EuiButton,
  EuiText,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PropsWithChildren } from 'react';
import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { useAddColumnName, errorMessages } from '../../hooks/use_add_column_name';
import type { IndexEditorTelemetryService } from '../../telemetry/telemetry_service';
import { isPlaceholderColumn } from '../../utils';
import { FieldTypeSelector } from './field_type_selector';

interface ColumnHeaderPopoverProps {
  isColumnInEditMode: boolean;
  setEditingColumnIndex: (columnIndex: number | null) => void;
  isSavedColumn: boolean;
  initialColumnName: string;
  initialColumnType: string | undefined;
  columnIndex: number;
  telemetryService: IndexEditorTelemetryService;
  originalColumnDisplay: React.ReactNode;
}

export const COLUMN_INDEX_PROP = 'data-column-index';

export const ColumnHeaderPopover = ({
  isColumnInEditMode,
  setEditingColumnIndex,
  isSavedColumn,
  initialColumnName,
  initialColumnType,
  columnIndex,
  telemetryService,
  originalColumnDisplay,
}: PropsWithChildren<ColumnHeaderPopoverProps>) => {
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
    // The default column header display comming from UnifiedDataTable, the type icon + column name
    <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false} css={{ cursor: 'pointer' }}>
      {initialColumnType === KBN_FIELD_TYPES.UNKNOWN && (
        <EuiIconTip
          type="warning"
          color="warning"
          size="m"
          content={i18n.translate('indexEditor.columnHeader.unsupportedWarning', {
            defaultMessage:
              'This type has partial suport, editions you do will be saved but will not be visible in this editor after closing it.',
          })}
        />
      )}
      {originalColumnDisplay}
    </EuiFlexGroup>
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

  if (isSavedColumn) {
    return columnLabel;
  }

  const triggerButton = (
    // This button is keyboard accesible via the column actions menu.
    // eslint-disable-next-line @elastic/eui/accessible-interactive-element
    <EuiButtonEmpty
      data-test-subj="indexEditorindexEditorColumnNameButton"
      aria-label={i18n.translate('indexEditor.columnHeaderEdit.aria', {
        defaultMessage: 'Edit column',
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
        onClickOutside: (e) => {
          // This prevents closing the popover when clicking on the EuiSelect options
          if (e.isTrusted) {
            setEditingColumnIndex(null);
          }
        },
        returnFocus,
      }}
      hasArrow={false}
      onKeyDown={(e: React.KeyboardEvent) => {
        // This prevents focus for going back to the grid header.
        if (e.key === 'Enter') {
          e.stopPropagation();
        }
      }}
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
          <FieldTypeSelector selectedType={columnType || null} onTypeChange={setColumnType} />
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
                data-test-subj="indexEditorindexEditorColumnNameAcceptButton"
                fill
                type="submit"
                disabled={!canSubmit}
                size="s"
              >
                <EuiText size="xs">
                  <FormattedMessage
                    id="indexEditor.flyout.grid.columnHeader.acceptButton"
                    defaultMessage="Accept"
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
