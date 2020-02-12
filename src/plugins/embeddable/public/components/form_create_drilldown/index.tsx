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
import { EuiForm, EuiFormRow, EuiFieldText } from '@elastic/eui';
import { DrilldownHelloBar } from '../drilldown_hello_bar';
import { txtNameOfDrilldown, txtUntitledDrilldown, txtDrilldownAction } from './i18n';
import { DrilldownPicker } from '../drilldown_picker';

// eslint-disable-next-line
export interface FormCreateDrilldownProps {}

export const FormCreateDrilldown: React.FC<FormCreateDrilldownProps> = () => {
  return (
    <div>
      <DrilldownHelloBar />
      <EuiForm>
        <EuiFormRow label={txtNameOfDrilldown}>
          <EuiFieldText name="drilldown_name" placeholder={txtUntitledDrilldown} />
        </EuiFormRow>
        <EuiFormRow label={txtDrilldownAction}>
          <DrilldownPicker />
        </EuiFormRow>
      </EuiForm>
    </div>
  );
};
