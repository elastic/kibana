/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPanel,
  useEuiTheme,
  EuiButtonEmpty,
  EuiForm,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KibanaContextExtra } from '../types';
import { ValueInput } from './value_input';

type ToggleMode = 'add-row' | 'add-column';

export const RowColumnCreator = ({ columns }: { columns: DatatableColumn[] }) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { indexUpdateService, notifications },
  } = useKibana<KibanaContextExtra>();

  const [activeMode, setActiveMode] = useState<ToggleMode | null>(null);

  const toggleAddRow = () => {
    setActiveMode('add-row');
  };

  const toggleAddColumn = () => {
    setActiveMode('add-column');
  };

  const cancelAction = () => {
    setActiveMode(null);
  };

  const [newRow, setNewRow] = useState<Record<string, unknown>>({});

  const updateRow = useCallback(
    (columnId: string) => (value: unknown) => {
      setNewRow((prev) => ({
        ...prev,
        [columnId]: value,
      }));
    },
    [setNewRow]
  );

  const inputs = useMemo(
    () =>
      columns.map((column, index) => {
        return (
          <ValueInput
            key={column.id}
            columnName={column.name}
            onChange={updateRow(column.id)}
            autoFocus={index === 0}
            css={css`
              min-width: ${230}px;
            `}
          />
        );
      }),
    [columns, updateRow]
  );

  const saveNewRow = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!validateNewRow()) {
        return;
      }

      const response = await indexUpdateService.saveDocsImmediately([{ value: newRow }]);

      if (!response.errors) {
        setActiveMode(null);
        notifications.toasts.addSuccess({
          title: i18n.translate('indexEditor.addRow.SuccessTitle', {
            defaultMessage: 'Row added successfully',
          }),
          text: i18n.translate('indexEditor.addRow.SuccessContent', {
            defaultMessage: 'Refresh the table to see the new row.',
          }),
        });
        return;
      }

      throw new Error(response.items[0].index?.error?.reason);
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('indexEditor.addRow.ErrorTitle', {
          defaultMessage: 'An error occurred while adding the row',
        }),
      });
    }
  };

  const validateNewRow = (): boolean => {
    // At least one column must have a value
    const hasValue = Object.values(newRow).some((v) => v !== undefined && v !== null && v !== '');
    if (!hasValue) {
      notifications.toasts.addDanger({
        title: i18n.translate('indexEditor.addRow.ValidationErrorTitle', {
          defaultMessage: 'Cannot add empty row',
        }),
        text: i18n.translate('indexEditor.addRow.ValidationErrorText', {
          defaultMessage: 'Please enter a value for at least one column before saving.',
        }),
      });
      return false;
    }
    return true;
  };

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={toggleAddRow}
            iconType="plusInCircle"
            size="s"
            disabled={activeMode === 'add-row'}
          >
            {i18n.translate('indexEditor.addRow', {
              defaultMessage: 'Add row',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={toggleAddColumn}
            iconType="plusInCircle"
            size="s"
            disabled={activeMode === 'add-column'}
          >
            {i18n.translate('indexEditor.addColumn', {
              defaultMessage: 'Add column',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {activeMode === 'add-row' && (
        <EuiPanel
          paddingSize="s"
          css={{
            background: euiTheme.colors.backgroundBaseSubdued,
            marginBottom: euiTheme.size.xs,
          }}
        >
          <EuiForm component="form" onSubmit={saveNewRow}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexGroup
                gutterSize="s"
                tabIndex={0}
                className="eui-xScrollWithShadows hide-scrollbar"
                css={css`
                  &.hide-scrollbar {
                    scrollbar-width: none;
                    padding: 0 ${euiTheme.size.xxs};
                  }
                `}
              >
                {inputs}
              </EuiFlexGroup>
              <EuiButtonIcon
                type="submit"
                iconType="check"
                display="base"
                color="success"
                aria-label="Save"
              />
              <EuiButtonIcon
                onClick={cancelAction}
                iconType="cross"
                display="base"
                color="danger"
                aria-label="Cancel"
              />
            </EuiFlexGroup>
          </EuiForm>
        </EuiPanel>
      )}
    </>
  );
};
