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

import { EuiSwitch, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AggParamEditorProps } from '../agg_param_props';

function AutoPrecisionParamEditor({ value = false, setValue }: AggParamEditorProps<boolean>) {
  const label = i18n.translate('visDefaultEditor.controls.changePrecisionLabel', {
    defaultMessage: 'Change precision on map zoom',
  });

  return (
    <EuiFormRow compressed>
      <EuiSwitch
        compressed={true}
        label={label}
        checked={value}
        onChange={(ev) => setValue(ev.target.checked)}
      />
    </EuiFormRow>
  );
}

export { AutoPrecisionParamEditor };
