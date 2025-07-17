/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiForm, useEuiTheme, EuiButtonIcon, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { ValueInput } from './grid_custom_renderers/value_input';
import { KibanaContextExtra } from '../types';

interface AddRowPanelProps {
  onHide: () => void;
}

export const AddRowPanel: React.FC<AddRowPanelProps> = ({ onHide }) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { indexUpdateService, notifications },
  } = useKibana<KibanaContextExtra>();

  const columns = useObservable(indexUpdateService.dataTableColumns$, []);

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

        const response = await indexUpdateService.addNewRow(newRow);

        if (!response.errors) {
          notifications.toasts.addSuccess({
            title: i18n.translate('indexEditor.addRow.SuccessTitle', {
              defaultMessage: 'Row added successfully',
            }),
            text: i18n.translate('indexEditor.addRow.SuccessContent', {
              defaultMessage: 'Refresh the table to see the new row.',
            }),
          });
          onHide();
          return;
        }

        throw new Error(response.items[0].index?.error?.reason || 'Unknown error occurred');
      } catch (error) {
        notifications.toasts.addError(error as Error, {
          title: i18n.translate('indexEditor.addRow.ErrorTitle', {
            defaultMessage: 'An error occurred while adding the row',
          }),
        });
      }
    },
    [newRow, indexUpdateService, notifications.toasts, onHide]
  );

  const inputs = useMemo(
    () =>
      columns.map((column, index) => {
        return (
          <EuiFlexItem key={column.id} grow={false}>
            <ValueInput
              key={column.id}
              columnName={column.name}
              columns={columns}
              onChange={updateRow(column.id)}
              autoFocus={index === 0}
              css={css`
                min-width: ${180}px;
              `}
            />
          </EuiFlexItem>
        );
      }),
    [columns, updateRow]
  );

  return (
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
                onClick={onHide}
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
  );
};
