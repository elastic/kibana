/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode, useCallback, ChangeEvent, useEffect } from 'react';
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
  value: number | null;
  'data-test-subj'?: string;
  setValue(paramName: ParamName, value: number | null): void;
  setValidity(paramName: ParamName, isValid: boolean): void;
}

/**
 * Use only this component instead of NumberInputOption in 'number_input.tsx'.
 * It is required for compatibility with TS 3.7.0
 *
 * @param {number} props.value Should be numeric only
 */
function RequiredNumberInputOption<ParamName extends string>({
  disabled,
  error,
  isInvalid,
  label,
  max,
  min,
  paramName,
  step,
  value,
  setValue,
  setValidity,
  'data-test-subj': dataTestSubj,
}: NumberInputOptionProps<ParamName>) {
  const isValid = value !== null;

  useEffect(() => {
    setValidity(paramName, isValid);

    return () => setValidity(paramName, true);
  }, [isValid, paramName, setValidity]);

  const onChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) =>
      setValue(paramName, isNaN(ev.target.valueAsNumber) ? null : ev.target.valueAsNumber),
    [setValue, paramName]
  );

  return (
    <EuiFormRow label={label} error={error} isInvalid={isInvalid} fullWidth display="rowCompressed">
      <EuiFieldNumber
        compressed
        fullWidth
        required
        data-test-subj={dataTestSubj}
        disabled={disabled}
        isInvalid={!isValid}
        step={step}
        max={max}
        min={min}
        value={value === null ? '' : value}
        onChange={onChange}
      />
    </EuiFormRow>
  );
}

export { RequiredNumberInputOption };
