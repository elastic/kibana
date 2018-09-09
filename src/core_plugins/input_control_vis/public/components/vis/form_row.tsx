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

import { EuiFormRow, EuiToolTip } from '@elastic/eui';
import React, { ReactElement } from 'react';

interface FormRowProps {
  disableMsg?: string;
  children: ReactElement<any>;
  controlIndex: number;
  label: string;
  id: string;
}

export function FormRow(props: FormRowProps) {
  const control = props.children;
  const disabledControl = props.disableMsg ? (
    <EuiToolTip position="top" content={props.disableMsg}>
      {control}
    </EuiToolTip>
  ) : (
    undefined
  );

  return (
    <EuiFormRow
      label={props.label}
      id={props.id}
      data-test-subj={'inputControl' + props.controlIndex}
    >
      {disabledControl || control}
    </EuiFormRow>
  );
}
