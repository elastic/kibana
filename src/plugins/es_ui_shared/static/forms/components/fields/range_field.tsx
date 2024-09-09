/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiFormRow, EuiRange, EuiRangeProps } from '@elastic/eui';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../hook_form_lib';

interface Props {
  field: FieldHook;
  euiFieldProps?: Record<string, any>;
  idAria?: string;
  [key: string]: any;
}

export const RangeField = ({ field, euiFieldProps = {}, idAria, ...rest }: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const { onChange: onFieldChange } = field;

  const onChange: EuiRangeProps['onChange'] = useCallback(
    (e) => {
      const event = { ...e, value: `${e.currentTarget.value}` };
      onFieldChange(event);
    },
    [onFieldChange]
  );

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
      <EuiRange
        value={field.value as number}
        onChange={onChange}
        max={10}
        min={0}
        showRange
        showInput
        fullWidth
        data-test-subj="range"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
