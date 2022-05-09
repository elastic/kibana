/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { OptionedValueProp } from '@kbn/data-plugin/public';
import { AggParamEditorProps, OptionedParamEditorProps } from '../agg_param_props';

function OrderParamEditor({
  aggParam,
  value,
  showValidation,
  setValue,
  setValidity,
  setTouched,
}: AggParamEditorProps<OptionedValueProp> & OptionedParamEditorProps) {
  const label = i18n.translate('visDefaultEditor.controls.orderLabel', {
    defaultMessage: 'Order',
  });
  const isValid = !!value;

  useEffect(() => {
    setValidity(isValid);
  }, [isValid, setValidity]);

  // @ts-ignore
  return (
    <EuiFormRow
      label={label}
      fullWidth={true}
      isInvalid={showValidation ? !isValid : false}
      display="rowCompressed"
    >
      <EuiSelect
        options={aggParam.options}
        value={value && value.value}
        onChange={(ev) =>
          setValue(aggParam.options.find((opt: OptionedValueProp) => opt.value === ev.target.value))
        }
        fullWidth={true}
        compressed
        isInvalid={showValidation ? !isValid : false}
        onBlur={setTouched}
      />
    </EuiFormRow>
  );
}

export { OrderParamEditor };
