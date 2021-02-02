/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useMemo } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';

interface SelectOptionProps<ParamName extends string, ValidParamValues extends string | number> {
  disabled?: boolean;
  helpText?: React.ReactNode;
  id?: string;
  label: string;
  labelAppend?: React.ReactNode;
  options: ReadonlyArray<{ readonly value: ValidParamValues; readonly text: string }>;
  paramName: ParamName;
  value?: ValidParamValues;
  setValue: (paramName: ParamName, value: ValidParamValues) => void;
  'data-test-subj'?: string;
}

const emptyValue = { text: '', value: 'EMPTY_VALUE', disabled: true, hidden: true };

function SelectOption<ParamName extends string, ValidParamValues extends string | number>({
  disabled,
  helpText,
  id,
  label,
  labelAppend,
  options,
  paramName,
  value,
  setValue,
  'data-test-subj': dataTestSubj,
}: SelectOptionProps<ParamName, ValidParamValues>) {
  const availableOptions = useMemo(() => [emptyValue, ...options], [options]);

  return (
    <EuiFormRow
      display="rowCompressed"
      fullWidth
      helpText={helpText}
      id={id}
      label={label}
      labelAppend={labelAppend}
    >
      <EuiSelect
        compressed
        disabled={disabled}
        options={availableOptions}
        value={value === undefined ? emptyValue.value : value}
        onChange={(ev) => setValue(paramName, ev.target.value as ValidParamValues)}
        fullWidth={true}
        data-test-subj={dataTestSubj}
      />
    </EuiFormRow>
  );
}

export { SelectOption };
