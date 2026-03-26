/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import camelCase from 'lodash/camelCase';

import type { FieldHook } from '../../hook_form_lib';
import { getFieldValidityAndErrorMessage } from '../../hook_form_lib';

interface Props {
  field: FieldHook;
  euiFieldProps?: Record<string, any>;
  idAria?: string;
  name?: string;
  [key: string]: any;
}

export const RadioGroupField = ({ field, euiFieldProps = {}, idAria, name, ...rest }: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const radioGroupName = name || camelCase(field.label || 'optionsGroup');

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
      <EuiRadioGroup
        idSelected={field.value as string}
        options={[]}
        onChange={field.setValue}
        data-test-subj="input"
        name={radioGroupName}
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
