/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { ReactNode, OptionHTMLAttributes } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../hook_form_lib';

interface Props {
  field: FieldHook;
  euiFieldProps: {
    options: Array<
      { text: string | ReactNode; [key: string]: any } & OptionHTMLAttributes<HTMLOptionElement>
    >;
    [key: string]: any;
  };
  idAria?: string;
  [key: string]: any;
}

export const SelectField = ({ field, euiFieldProps, idAria, ...rest }: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  return (
    <EuiFormRow
      label={field.label}
      helpText={typeof field.helpText === 'function' ? field.helpText() : field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      describedByIds={idAria ? [idAria] : undefined}
      {...rest}
    >
      <EuiSelect
        fullWidth
        value={field.value as string}
        onChange={(e) => {
          field.setValue(e.target.value);
        }}
        hasNoInitialSelection={true}
        isInvalid={isInvalid}
        data-test-subj="select"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
