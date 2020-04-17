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
    <EuiFormRow label={label} error={error} isInvalid={isInvalid} fullWidth compressed>
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
        onChange={ev =>
          setValue(paramName, isNaN(ev.target.valueAsNumber) ? '' : ev.target.valueAsNumber)
        }
      />
    </EuiFormRow>
  );
}

export { NumberInputOption };
