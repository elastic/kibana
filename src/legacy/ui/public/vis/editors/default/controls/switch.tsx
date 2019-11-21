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
import { AggParamEditorProps } from '..';

interface SwitchParamEditorProps extends AggParamEditorProps<boolean> {
  dataTestSubj?: string;
  displayLabel?: string;
  displayToolTip?: string;
  disabled?: boolean;
}

function SwitchParamEditor({
  value = false,
  setValue,
  dataTestSubj,
  displayToolTip,
  displayLabel,
  disabled,
}: SwitchParamEditorProps) {
  return (
    <EuiFormRow fullWidth={true}>
      <EuiToolTip content={displayToolTip} delay="long" position="right">
        <EuiSwitch
          compressed={true}
          label={displayLabel}
          checked={value}
          disabled={disabled}
          data-test-subj={dataTestSubj}
          onChange={ev => setValue(ev.target.checked)}
        />
      </EuiToolTip>
    </EuiFormRow>
  );
}

export { SwitchParamEditor };
