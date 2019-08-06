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
import { EuiFormRow, EuiRange } from '@elastic/eui';
import { VisOptionsSetValue } from 'ui/vis/editors/default';

interface RangeOptionProps {
  label: string;
  max: number;
  min: number;
  paramName: string;
  step?: number;
  value: string | number;
  setValue: VisOptionsSetValue;
}

function RangeOption({ label, max, min, step, paramName, value, setValue }: RangeOptionProps) {
  return (
    <EuiFormRow label={label} fullWidth={true} compressed>
      <EuiRange
        fullWidth
        showValue
        max={max}
        min={min}
        step={step}
        value={value}
        onChange={ev => setValue(paramName, ev.target.value)}
      />
    </EuiFormRow>
  );
}

export { RangeOption };
