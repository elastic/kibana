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
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  OptionedValueProp,
  OptionedParamEditorProps,
} from '../../../../agg_types/param_types/optioned';
import { AggParamEditorProps } from '..';

function OrderParamEditor({
  aggParam,
  value,
  showValidation,
  setValue,
  setValidity,
  setTouched,
}: AggParamEditorProps<OptionedValueProp> & OptionedParamEditorProps) {
  const label = i18n.translate('common.ui.aggTypes.orderLabel', {
    defaultMessage: 'Order',
  });
  const isValid = !!value;

  useEffect(() => {
    setValidity(isValid);
  }, [isValid]);

  // @ts-ignore
  return (
    <EuiFormRow
      label={label}
      fullWidth={true}
      isInvalid={showValidation ? !isValid : false}
      compressed
    >
      <EuiSelect
        options={aggParam.options}
        value={value && value.value}
        onChange={ev =>
          setValue(aggParam.options.find((opt: OptionedValueProp) => opt.value === ev.target.value))
        }
        fullWidth={true}
        isInvalid={showValidation ? !isValid : false}
        onBlur={setTouched}
      />
    </EuiFormRow>
  );
}

export { OrderParamEditor };
