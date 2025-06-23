/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiForm, EuiButtonIcon, EuiFieldText, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { KibanaContextExtra } from '../types';

interface AddColumnPanelProps {
  onHide: () => void;
}

export const AddColumnPanel: React.FC<AddColumnPanelProps> = ({ onHide }) => {
  const {
    services: { indexUpdateService, notifications },
  } = useKibana<KibanaContextExtra>();

  const typeOptions = Object.values(ES_FIELD_TYPES).map((type) => ({
    value: type,
    inputDisplay: type,
  }));

  const [columnName, setColumnName] = useState('');
  const [columnType, setColumnType] = useState<ES_FIELD_TYPES>();

  const saveNewColumn = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      try {
        // Is there a max length for column names?
        // const response = await indexUpdateService.bulkUpdate([{ value: newRow }]);
      } catch (error) {
        notifications.toasts.addError(error as Error, {
          title: i18n.translate('indexEditor.addCOlumn.ErrorTitle', {
            defaultMessage: 'An error occurred while adding the new column',
          }),
        });
      }
    },
    [notifications.toasts]
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
          <EuiSuperSelect
            compressed
            options={typeOptions}
            valueOfSelected={columnType}
            onChange={setColumnType}
            placeholder={i18n.translate('indexEditor.addColumn.name.aria', {
              defaultMessage: 'Column type',
            })}
            aria-label={i18n.translate('indexEditor.addColumn.name.aria', {
              defaultMessage: 'Column type select',
            })}
            css={{ minWidth: '230px' }}
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
