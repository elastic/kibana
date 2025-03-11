/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

  const error = i18n.translate('visDefaultEditor.options.rangeErrorMessage', {
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
    <EuiFormRow
      label={label}
      fullWidth={true}
      isInvalid={!isValidState}
      error={error}
      display="rowCompressed"
    >
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
