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

import React from 'react';
import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';

interface NumberInputOptionProps<ParamName extends string> {
  dataTestSubj?: string;
  isInvalid?: boolean;
  label?: React.ReactNode;
  max?: number;
  min?: number;
  step?: string | number;
  paramName: ParamName;
  value?: number | '';
  setValue: (paramName: ParamName, value: number | '') => void;
  setTouched?(): void;
}

function NumberInputOption<ParamName extends string>({
  dataTestSubj,
  isInvalid,
  label,
  max,
  min,
  paramName,
  step,
  value = '',
  setValue,
  setTouched,
}: NumberInputOptionProps<ParamName>) {
  return (
    <EuiFormRow label={label} fullWidth compressed>
      <EuiFieldNumber
        data-test-subj={dataTestSubj}
        isInvalid={isInvalid}
        fullWidth
        step={step}
        max={max}
        min={min}
        value={value}
        onChange={ev =>
          setValue(paramName, isNaN(ev.target.valueAsNumber) ? '' : ev.target.valueAsNumber)
        }
        onBlur={setTouched}
      />
    </EuiFormRow>
  );
}

export { NumberInputOption };
