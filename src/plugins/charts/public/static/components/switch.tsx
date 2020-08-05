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

import { EuiFormRow, EuiSwitch, EuiToolTip } from '@elastic/eui';

interface SwitchOptionProps<ParamName extends string> {
  'data-test-subj'?: string;
  label?: string;
  tooltip?: string;
  disabled?: boolean;
  value?: boolean;
  paramName: ParamName;
  setValue: (paramName: ParamName, value: boolean) => void;
}

function SwitchOption<ParamName extends string>({
  'data-test-subj': dataTestSubj,
  tooltip,
  label,
  disabled,
  paramName,
  value = false,
  setValue,
}: SwitchOptionProps<ParamName>) {
  return (
    <EuiFormRow fullWidth={true} compressed={true}>
      <EuiToolTip content={tooltip} delay="long" position="right">
        <EuiSwitch
          compressed={true}
          label={label}
          checked={value}
          disabled={disabled}
          data-test-subj={dataTestSubj}
          onChange={(ev) => setValue(paramName, ev.target.checked)}
        />
      </EuiToolTip>
    </EuiFormRow>
  );
}

export { SwitchOption };
