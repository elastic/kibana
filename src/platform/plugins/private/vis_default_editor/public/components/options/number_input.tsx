/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode } from 'react';
import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';

interface NumberInputOptionProps<ParamName extends string> {
  disabled?: boolean;
  error?: ReactNode;
  isInvalid?: boolean;
  label?: React.ReactNode;
  max?: number;
  min?: number;
  paramName: ParamName;
  step?: number;
  value?: number | '';
  'data-test-subj'?: string;
  setValue: (paramName: ParamName, value: number | '') => void;
}

/**
 * Do not use this component anymore.
 * Please, use NumberInputOption in 'required_number_input.tsx'.
 * It is required for compatibility with TS 3.7.0
 * This should be removed in the future
 */
function NumberInputOption<ParamName extends string>({
  disabled,
  error,
  isInvalid,
  label,
  max,
  min,
  paramName,
  step,
  value = '',
  setValue,
  'data-test-subj': dataTestSubj,
}: NumberInputOptionProps<ParamName>) {
  return (
    <EuiFormRow label={label} error={error} isInvalid={isInvalid} fullWidth display="rowCompressed">
      <EuiFieldNumber
        data-test-subj={dataTestSubj}
        disabled={disabled}
        compressed
        fullWidth
        isInvalid={isInvalid}
        step={step}
        max={max}
        min={min}
        value={value}
        onChange={(ev) =>
          setValue(paramName, isNaN(ev.target.valueAsNumber) ? '' : ev.target.valueAsNumber)
        }
      />
    </EuiFormRow>
  );
}

export { NumberInputOption, type NumberInputOptionProps };
