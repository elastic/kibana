/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';

interface TextInputOptionProps<ParamName extends string> {
  disabled?: boolean;
  helpText?: React.ReactNode;
  label?: React.ReactNode;
  paramName: ParamName;
  value?: string;
  'data-test-subj'?: string;
  setValue: (paramName: ParamName, value: string) => void;
}

function TextInputOption<ParamName extends string>({
  'data-test-subj': dataTestSubj,
  disabled,
  helpText,
  label,
  paramName,
  value = '',
  setValue,
}: TextInputOptionProps<ParamName>) {
  return (
    <EuiFormRow helpText={helpText} label={label} fullWidth display="rowCompressed">
      <EuiFieldText
        compressed
        fullWidth
        data-test-subj={dataTestSubj}
        disabled={disabled}
        value={value}
        onChange={(ev) => setValue(paramName, ev.target.value)}
      />
    </EuiFormRow>
  );
}

export { TextInputOption };
