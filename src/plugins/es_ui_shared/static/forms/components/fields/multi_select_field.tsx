/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFormRow, EuiSelectable, EuiPanel } from '@elastic/eui';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../hook_form_lib';

interface Props {
  field: FieldHook;
  euiFieldProps?: Record<string, any>;
  idAria?: string;
  [key: string]: any;
}

export const MultiSelectField = ({ field, euiFieldProps = {}, idAria, ...rest }: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  return (
    <EuiFormRow
      label={field.label}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      describedByIds={idAria ? [idAria] : undefined}
      {...rest}
    >
      <EuiSelectable
        allowExclusions={false}
        height={300}
        onChange={(options) => {
          field.setValue(options);
        }}
        options={field.value as any[]}
        data-test-subj="select"
        {...euiFieldProps}
      >
        {(list, search) => (
          <EuiPanel paddingSize="s" hasShadow={false}>
            {search}
            {list}
          </EuiPanel>
        )}
      </EuiSelectable>
    </EuiFormRow>
  );
};
