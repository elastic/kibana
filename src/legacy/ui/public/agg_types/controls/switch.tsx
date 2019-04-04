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

import { EuiFormRow, EuiIconTip, EuiSwitch } from '@elastic/eui';

interface SwitchParamEditorProps {
  value: boolean;
  label: string;
  tooltipContent: string;
  dataTestSubj?: string;
  setValue(value: boolean): void;
}

function SwitchParamEditor({
  value,
  label,
  tooltipContent,
  dataTestSubj,
  setValue,
}: SwitchParamEditorProps) {
  return (
    <EuiFormRow className="visEditorSidebar__aggParamFormRow visEditorSidebar__switchControl">
      <>
        <EuiSwitch
          label={label}
          checked={value}
          data-test-subj={dataTestSubj}
          onChange={ev => setValue(ev.target.checked)}
        />
        <EuiIconTip
          position="right"
          content={tooltipContent}
          type="questionInCircle"
          aria-label={tooltipContent}
        />
      </>
    </EuiFormRow>
  );
}

export { SwitchParamEditor };
