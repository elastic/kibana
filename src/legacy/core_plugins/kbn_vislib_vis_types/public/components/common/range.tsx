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

import React, { useState } from 'react';
import { EuiFormRow, EuiRange, EuiRangeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface RangeOptionProps<ParamName extends string> {
  label: string;
  max: number;
  min: number;
  paramName: ParamName;
  showInput?: boolean;
  showLabels?: boolean;
  showValue?: boolean;
  step?: number;
  value: '' | number;
  setValue: (paramName: ParamName, value: number) => void;
}

function RangeOption<ParamName extends string>({
  label,
  max,
  min,
  showInput,
  showLabels,
  showValue = true,
  step,
  paramName,
  value,
  setValue,
}: RangeOptionProps<ParamName>) {
  const [stateValue, setStateValue] = useState(value);
  const [isValidState, setIsValidState] = useState(true);

  const error = i18n.translate('kbnVislibVisTypes.controls.rangeErrorMessage', {
    defaultMessage: 'Values must be on or between {min} and {max}',
    values: { min, max },
  });

  const onChangeHandler: EuiRangeProps['onChange'] = (event, isValid) => {
    const { valueAsNumber } = event.target as HTMLInputElement; // since we don't show ticks on EuiRange, the target will definitely be HTMLInputElement type, so we can cast it directly.

    setStateValue(valueAsNumber);
    setIsValidState(isValid);

    if (isValid) {
      setValue(paramName, valueAsNumber);
    }
  };
  return (
    <EuiFormRow label={label} fullWidth={true} isInvalid={!isValidState} error={error} compressed>
      <EuiRange
        compressed
        fullWidth
        max={max}
        min={min}
        showInput={showInput}
        showLabels={showLabels}
        showValue={showValue}
        step={step}
        value={stateValue}
        onChange={onChangeHandler}
      />
    </EuiFormRow>
  );
}

export { RangeOption };
