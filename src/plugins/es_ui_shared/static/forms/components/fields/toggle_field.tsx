/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiFormRow, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../hook_form_lib';

interface Props {
  field: FieldHook<boolean>;
  euiFieldProps?: Record<string, any>;
  idAria?: string;
  [key: string]: any;
}

export const ToggleField = ({ field, euiFieldProps = {}, idAria, ...rest }: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  // Shim for sufficient overlap between EuiSwitchEvent and FieldHook[onChange] event
  const onChange = (e: EuiSwitchEvent) => {
    const event = ({ ...e, value: `${e.target.checked}` } as unknown) as React.ChangeEvent<{
      value: string;
    }>;
    field.onChange(event);
  };

  return (
    <EuiFormRow
      helpText={typeof field.helpText === 'function' ? field.helpText() : field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      describedByIds={idAria ? [idAria] : undefined}
      {...rest}
    >
      <EuiSwitch
        label={field.label}
        checked={field.value as boolean}
        onChange={onChange}
        data-test-subj="input"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
