/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ChangeEvent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { DataView, UseField } from '../../shared_imports';
import { IndexPatternConfig } from '../../types';

interface NameFieldProps {
  editData?: DataView;
}

export const NameField = ({ editData }: NameFieldProps) => {
  return (
    <UseField<string, IndexPatternConfig>
      path="name"
      componentProps={{
        euiFieldProps: {
          'aria-label': i18n.translate('indexPatternEditor.form.nameAriaLabel', {
            defaultMessage: 'Name field optional',
          }),
        },
      }}
    >
      {(field) => {
        return (
          <EuiFormRow label={field.label} fullWidth>
            <EuiFieldText
              value={field.value}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                field.setValue(e.target.value);
              }}
              fullWidth
              data-test-subj="createIndexPatternNameInput"
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};
