/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiForm, EuiButtonIcon, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAddColumnName } from '../hooks/use_add_column_name';

interface AddColumnPanelProps {
  onHide: () => void;
}

export const AddColumnPanel: React.FC<AddColumnPanelProps> = ({ onHide }) => {
  const { columnName, setColumnName, saveNewColumn } = useAddColumnName();

  const onSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (await saveNewColumn()) {
        onHide();
      }
    },
    [saveNewColumn, onHide]
  );

  return (
    <EuiForm component="form" onSubmit={onSubmit}>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexGroup gutterSize="s">
          <EuiFieldText
            autoFocus
            compressed
            required
            placeholder={i18n.translate('indexEditor.addColumn.name', {
              defaultMessage: 'Field name',
            })}
            value={columnName}
            aria-label={i18n.translate('indexEditor.addColumn.name.aria', {
              defaultMessage: 'Field name input',
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
