/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiFormRow, EuiRange } from '@elastic/eui';
import React, { useCallback } from 'react';
import { getFieldValidityAndErrorMessage } from '../../hook_form_lib/helpers';
import type { FieldHook } from '../../hook_form_lib/types';

interface Props {
  field: FieldHook;
  euiFieldProps?: Record<string, any>;
  idAria?: string;
  [key: string]: any;
}

export const RangeField = ({ field, euiFieldProps = {}, idAria, ...rest }: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const { onChange: onFieldChange } = field;

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>) => {
      const event = ({ ...e, value: `${e.currentTarget.value}` } as unknown) as React.ChangeEvent<{
        value: string;
      }>;
      onFieldChange(event);
    },
    [onFieldChange]
  );

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
