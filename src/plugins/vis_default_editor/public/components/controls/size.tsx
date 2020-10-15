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

import React, { useEffect } from 'react';
import { isUndefined } from 'lodash';
import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { AggParamEditorProps } from '../agg_param_props';

export interface SizeParamEditorProps extends AggParamEditorProps<number | ''> {
  iconTip?: React.ReactNode;
  disabled?: boolean;
}

function SizeParamEditor({
  disabled,
  iconTip,
  value,
  setValue,
  showValidation,
  setValidity,
  setTouched,
}: SizeParamEditorProps) {
  const label = (
    <>
      <FormattedMessage id="visDefaultEditor.controls.sizeLabel" defaultMessage="Size" />
      {iconTip}
    </>
  );
  const isValid = disabled || Number(value) > 0;

  useEffect(() => {
    setValidity(isValid);
  }, [isValid, setValidity]);

  return (
    <EuiFormRow
      label={label}
      fullWidth={true}
      isInvalid={showValidation ? !isValid : false}
      compressed
    >
      <EuiFieldNumber
        value={isUndefined(value) ? '' : value}
        onChange={(ev) => setValue(ev.target.value === '' ? '' : parseFloat(ev.target.value))}
        fullWidth={true}
        compressed
        isInvalid={showValidation ? !isValid : false}
        onBlur={setTouched}
        min={1}
        disabled={disabled}
        data-test-subj="sizeParamEditor"
      />
    </EuiFormRow>
  );
}

export { SizeParamEditor };
