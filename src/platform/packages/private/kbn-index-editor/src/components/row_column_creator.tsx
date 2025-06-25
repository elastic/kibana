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
import { FormattedMessage } from '@kbn/i18n-react';
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
          <EuiFlexItem key={column.id} grow={false}>
            <ValueInput
              columnName={column.name}
              onChange={updateRow(column.id)}
              autoFocus={index === 0}
              css={css`
                min-width: ${230}px;
              `}
            />
          </EuiFlexItem>
        );
      }),
    [columns, updateRow]
  );

  const saveNewRow = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      try {
        // At least one column must have a value
        const hasValue = Object.values(newRow).some(
          (v) => v !== undefined && v !== null && v !== ''
        );
        if (!hasValue) {
          notifications.toasts.addDanger({
            title: i18n.translate('indexEditor.addRow.ValidationErrorTitle', {
              defaultMessage: 'Cannot add empty row',
            }),
            text: i18n.translate('indexEditor.addRow.ValidationErrorText', {
              defaultMessage: 'Please enter a value for at least one column before saving.',
            }),
          });
          return;
        }

        const response = await indexUpdateService.bulkUpdate([{ value: newRow }]);

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
    },
    [newRow, indexUpdateService, notifications]
  );

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
            <FormattedMessage defaultMessage="Add row" id="indexEditor.addRow" />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={toggleAddColumn}
            iconType="plusInCircle"
            size="s"
            disabled={activeMode === 'add-column'}
          >
            <FormattedMessage defaultMessage="Add column" id="indexEditor.addColumn" />
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
            <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem css={{ overflow: 'hidden' }}>
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
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem>
                    <EuiButtonIcon
                      type="submit"
                      iconType="check"
                      display="base"
                      color="success"
                      aria-label={i18n.translate('indexEditor.addRow.save', {
                        defaultMessage: 'Save',
                      })}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiButtonIcon
                      onClick={cancelAction}
                      iconType="cross"
                      display="base"
                      color="danger"
                      aria-label={i18n.translate('indexEditor.addRow.cancel', {
                        defaultMessage: 'Cancel',
                      })}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiForm>
        </EuiPanel>
      )}
    </>
  );
};
