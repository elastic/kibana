/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useEffect, useCallback } from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';

import { AggParamEditorProps } from '../agg_param_props';

function StringParamEditor({
  agg,
  aggParam,
  showValidation,
  value,
  setValidity,
  setValue,
  setTouched,
}: AggParamEditorProps<string>) {
  const isValid = aggParam.required ? !!value : true;

  useEffect(() => {
    setValidity(isValid);
  }, [isValid, setValidity]);

  const onChange = useCallback((ev) => setValue(ev.target.value), [setValue]);

  return (
    <EuiFormRow
      className="visEditorAggParam__string"
      label={aggParam.displayName || aggParam.name}
      fullWidth={true}
      display="rowCompressed"
      isInvalid={showValidation ? !isValid : false}
    >
      <EuiFieldText
        value={value || ''}
        data-test-subj={`visEditorStringInput${agg.id}${aggParam.name}`}
        onChange={onChange}
        fullWidth={true}
        compressed
        onBlur={setTouched}
        isInvalid={showValidation ? !isValid : false}
      />
    </EuiFormRow>
  );
}

export { StringParamEditor };
