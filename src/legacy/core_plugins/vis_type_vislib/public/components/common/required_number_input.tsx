/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { ReactNode, useCallback, ChangeEvent } from 'react';
import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';
import { useValidation } from './utils';

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
function NumberInputOption<ParamName extends string>({
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
  useValidation(setValidity, paramName, isValid);

  const onChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) =>
      setValue(paramName, isNaN(ev.target.valueAsNumber) ? null : ev.target.valueAsNumber),
    [setValue, paramName]
  );

  return (
    <EuiFormRow label={label} error={error} isInvalid={isInvalid} fullWidth compressed>
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

export { NumberInputOption };
