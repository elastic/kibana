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
import { EuiFormRow, EuiFieldText } from '@elastic/eui';

interface TextInputOptionProps<ParamName extends string> {
  disabled?: boolean;
  helpText?: React.ReactNode;
  label?: React.ReactNode;
  paramName: ParamName;
  value?: string;
  'data-test-subj'?: string;
  setValue: (paramName: ParamName, value: string) => void;
}

function TextInputOption<ParamName extends string>({
  'data-test-subj': dataTestSubj,
  disabled,
  helpText,
  label,
  paramName,
  value = '',
  setValue,
}: TextInputOptionProps<ParamName>) {
  return (
    <EuiFormRow helpText={helpText} label={label} fullWidth compressed>
      <EuiFieldText
        fullWidth
        data-test-subj={dataTestSubj}
        disabled={disabled}
        value={value}
        onChange={ev => setValue(paramName, ev.target.value)}
      />
    </EuiFormRow>
  );
}

export { TextInputOption };
