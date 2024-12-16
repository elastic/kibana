/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonGroup, EuiButtonGroupOptionProps, EuiFormRow } from '@elastic/eui';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../hook_form_lib';

interface Props {
  field: FieldHook;
  euiFieldProps: {
    options: EuiButtonGroupOptionProps[];
    legend: string;
    [key: string]: any;
  };
  idAria?: string;
  [key: string]: any;
}

export const ButtonGroupField = ({ field, euiFieldProps, idAria, ...rest }: Props) => {
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
      <EuiButtonGroup
        isFullWidth
        onChange={(e) => {
          field.setValue(e);
        }}
        idSelected={field.value as string}
        type="single"
        data-test-subj="button-group"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
