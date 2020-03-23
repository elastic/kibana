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
      compressed
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
        onChange={ev => setValue(paramName, ev.target.value as ValidParamValues)}
        fullWidth={true}
        data-test-subj={dataTestSubj}
      />
    </EuiFormRow>
  );
}

export { SelectOption };
