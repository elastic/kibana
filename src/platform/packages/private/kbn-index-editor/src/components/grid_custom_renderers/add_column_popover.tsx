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
  EuiPopover,
  EuiForm,
  EuiFormRow,
  EuiPopoverFooter,
  EuiFieldText,
  EuiFlexGroup,
  EuiButton,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PropsWithChildren } from 'react';
import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { FieldSelect } from '@kbn/field-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useAddColumn, errorMessages } from '../../hooks/use_add_column';
import type { IndexEditorTelemetryService } from '../../telemetry/telemetry_service';
import type { KibanaContextExtra } from '../../types';

interface AddColumnPopoverProps {
  isPopoverOpen: boolean;
  closePopover: () => void;
  initialColumnName?: string;
  initialColumnType?: string;
  columnIndex?: number;
  telemetryService: IndexEditorTelemetryService;
  triggerButton: React.ReactElement;
}

export const COLUMN_INDEX_PROP = 'data-column-index';

export const AddColumnPopover = ({
  isPopoverOpen,
  closePopover,
  initialColumnName,
  initialColumnType,
  columnIndex,
  telemetryService,
  triggerButton,
}: PropsWithChildren<AddColumnPopoverProps>) => {
  const { euiTheme } = useEuiTheme();

  const {
    services: { docLinks },
  } = useKibana<KibanaContextExtra>();

  const { columnType, setColumnType, columnName, setColumnName, saveColumn, validationError } =
    useAddColumn(initialColumnName, initialColumnType);

  const canSubmit = useMemo(
    () => columnType && columnName.length > 0 && !validationError,
    [columnType, columnName, validationError]
  );

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (columnName && !validationError) {
        closePopover();
        saveColumn();
        setColumnName('');
        setColumnType(null);
      } else {
        telemetryService.trackEditInteraction({
          actionType: 'add_column',
          failureReason: validationError || 'EMPTY_NAME',
        });
      }
    },
    [
      columnName,
      validationError,
      closePopover,
      saveColumn,
      setColumnName,
      setColumnType,
      telemetryService,
    ]
  );

  const errorMessage = useMemo(() => {
    if (!validationError) return;
    return errorMessages[validationError]
      ? errorMessages[validationError](columnName)
      : validationError;
  }, [validationError, columnName]);

  const returnFocus = useCallback(() => {
    if (columnIndex === undefined) {
      return true;
    }

    requestAnimationFrame(() => {
      const headerWrapper = findElementBySelectorOrRef(`[${COLUMN_INDEX_PROP}="${columnIndex}"]`);
      headerWrapper?.focus();
    });

    return false;
  }, [columnIndex]);

  return (
    <EuiPopover
      button={triggerButton}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      focusTrapProps={{
        noIsolation: false,
        clickOutsideDisables: false,
        onClickOutside: (e) => {
          // This prevents closing the popover when clicking on the EuiSelect options
          if (e.isTrusted) {
            closePopover();
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
      <EuiForm component="form" onSubmit={onSubmit} css={{ width: 300 }}>
        <EuiFormRow
          label={i18n.translate('indexEditor.columnHeaderEdit.fieldType', {
            defaultMessage: 'Select a field type',
          })}
          helpText={i18n.translate('indexEditor.columnHeaderEdit.fieldTypeHelpText', {
            defaultMessage: `You won't be able to change the type after saving the lookup index.`,
          })}
        >
          <FieldSelect
            selectedType={columnType || null}
            onTypeChange={setColumnType}
            data-test-subj="indexEditorColumnTypeSelect"
            docLinks={docLinks}
          />
        </EuiFormRow>
        {(columnType || columnName.length > 0) && (
          <EuiPopoverFooter>
            <EuiFormRow
              label={i18n.translate('indexEditor.columnHeaderEdit.columnNameLabel', {
                defaultMessage: 'Name',
              })}
              isInvalid={Boolean(errorMessage)}
              error={errorMessage}
            >
              <EuiFieldText
                isInvalid={Boolean(errorMessage)}
                data-test-subj="indexEditorColumnNameInput"
                value={columnName}
                placeholder={i18n.translate('indexEditor.columnHeaderEdit.columnNamePlaceholder', {
                  defaultMessage: 'Enter field name',
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
              <EuiButton color="text" size="s" onClick={closePopover}>
                <EuiText size="xs">
                  <FormattedMessage
                    id="indexEditor.flyout.grid.columnHeader.cancelButton"
                    defaultMessage="Cancel"
                  />
                </EuiText>
              </EuiButton>
              <EuiButton
                data-test-subj="indexEditorColumnNameAcceptButton"
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
