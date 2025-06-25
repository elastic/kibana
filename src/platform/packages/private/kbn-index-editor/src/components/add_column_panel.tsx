/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiForm, EuiButtonIcon, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { KibanaContextExtra } from '../types';

interface AddColumnPanelProps {
  onHide: () => void;
  columns: DatatableColumn[];
}

export const AddColumnPanel: React.FC<AddColumnPanelProps> = ({ onHide, columns }) => {
  const {
    services: { indexUpdateService, notifications },
  } = useKibana<KibanaContextExtra>();

  const [columnName, setColumnName] = useState('');

  const saveNewColumn = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!columnName) {
        notifications.toasts.addWarning({
          title: i18n.translate('indexEditor.addColumn.emptyName', {
            defaultMessage: 'Column name cannot be empty',
          }),
        });
        return;
      }

      if (columns.some((existingColumn) => existingColumn.name === columnName)) {
        notifications.toasts.addWarning({
          title: i18n.translate('indexEditor.addColumn.duplicatedName', {
            defaultMessage: 'Column name {columnName} already exists',
            values: { columnName },
          }),
        });
        return;
      }

      indexUpdateService.addNewField(columnName);
      notifications.toasts.addSuccess({
        title: i18n.translate('indexEditor.addColumn.success', {
          defaultMessage: 'Column {columnName} has been partially added',
          values: { columnName },
        }),
        text: i18n.translate('indexEditor.addColumn.successDescription', {
          defaultMessage: 'You need to add at least one value to this column before it is saved.',
        }),
        toastLifeTimeMs: 10000, // 10 seconds
      });
      onHide();
    },
    [columnName, columns, indexUpdateService, notifications.toasts, onHide]
  );

  return (
    <EuiForm component="form" onSubmit={saveNewColumn}>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexGroup gutterSize="s">
          <EuiFieldText
            autoFocus
            compressed
            placeholder={i18n.translate('indexEditor.addColumn.name', {
              defaultMessage: 'Column name',
            })}
            value={columnName}
            aria-label={i18n.translate('indexEditor.addColumn.name.aria', {
              defaultMessage: 'Column name input',
            })}
            onChange={(e) => {
              setColumnName(e.target.value);
            }}
            type="text"
          />
        </EuiFlexGroup>
        <EuiButtonIcon
          type="submit"
          iconType="check"
          display="base"
          color="success"
          aria-label={i18n.translate('indexEditor.addColumn.save', {
            defaultMessage: 'Save',
          })}
        />
        <EuiButtonIcon
          onClick={onHide}
          iconType="cross"
          display="base"
          color="danger"
          aria-label={i18n.translate('indexEditor.addColumn.cancel', {
            defaultMessage: 'Cancel',
          })}
        />
      </EuiFlexGroup>
    </EuiForm>
  );
};
