/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { isUndefined } from 'lodash';
import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { AggParamEditorProps } from '../../agg_param_props';

function PrefixLengthObject({ 
  value,
  setValue,
  setValidity,
  showValidation,
  setTouched,
}: AggParamEditorProps<number>) {

  const label = (
    <>
      <FormattedMessage
        id="visDefaultEditor.controls.IpPrefix.prefixLengthLabel"
        defaultMessage="Prefix Length"
      />
    </>
  );

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
        max={32}
        data-test-subj="prefixLengthParamEditor"
      />
    </EuiFormRow>
  );
}

export { PrefixLengthObject };
