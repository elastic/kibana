/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { isUndefined } from 'lodash';
import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { AggParamEditorProps } from '../agg_param_props';

export interface PrefixLengthParamEditorProps extends AggParamEditorProps<number | ''> {
  iconTip?: React.ReactNode;
  disabled?: boolean;
}

function PrefixLengthParamEditor({
  aggParam,
  disabled,
  iconTip,
  value,
  setValue,
  showValidation,
  setValidity,
  setTouched,
}: PrefixLengthParamEditorProps) {
  const fieldTitle = aggParam.displayName == "prefixLength64" ? "IPv6" : "IPv4";
  const maxValue = aggParam.displayName == "prefixLength64" ? 128 : 32;

  const label = (
    <>
      <FormattedMessage id="visDefaultEditor.controls.prefixLengthLabel" defaultMessage="{fieldTitle} Prefix Length" values={{ fieldTitle: fieldTitle }} />
      {iconTip}
    </>
  );
  
  const isValid = disabled || (Number(value) >= 0 && Number(value) <= maxValue);

  useEffect(() => {
    setValidity(isValid);
  }, [isValid, setValidity]);

  return (
    <EuiFormRow
      label={label}
      fullWidth={true}
      isInvalid={showValidation ? !isValid : false}
      display="rowCompressed"
    >
      <EuiFieldNumber
        value={isUndefined(value) ? '' : value}
        onChange={(ev) => setValue(ev.target.value === '' ? '' : parseFloat(ev.target.value))}
        fullWidth={true}
        compressed
        isInvalid={showValidation ? !isValid : false}
        onBlur={setTouched}
        min={0}
        max={maxValue}
        disabled={disabled}
        data-test-subj="prefixLengthParamEditor"
      />
    </EuiFormRow>
  );
}

export { PrefixLengthParamEditor };
