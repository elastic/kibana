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

import React, { ChangeEvent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';

interface TruncateLabelsOptionProps {
  disabled?: boolean;
  value?: number | null;
  setValue: (paramName: 'truncate', value: null | number) => void;
}

function TruncateLabelsOption({ disabled, value = null, setValue }: TruncateLabelsOptionProps) {
  const onChange = (ev: ChangeEvent<HTMLInputElement>) =>
    setValue('truncate', ev.target.value === '' ? null : parseFloat(ev.target.value));

  return (
    <EuiFormRow
      label={i18n.translate('kbnVislibVisTypes.controls.truncateLabel', {
        defaultMessage: 'Truncate',
      })}
      fullWidth
      compressed
    >
      <EuiFieldNumber
        disabled={disabled}
        value={value === null ? '' : value}
        onChange={onChange}
        fullWidth
        compressed
      />
    </EuiFormRow>
  );
}

export { TruncateLabelsOption };
