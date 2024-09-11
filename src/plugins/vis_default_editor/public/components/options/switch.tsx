/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiFormRow, EuiSwitch, EuiToolTip } from '@elastic/eui';

interface SwitchOptionProps<ParamName extends string> {
  'data-test-subj'?: string;
  label?: string;
  tooltip?: string;
  disabled?: boolean;
  value?: boolean;
  paramName: ParamName;
  setValue: (paramName: ParamName, value: boolean) => void;
}

function SwitchOption<ParamName extends string>({
  'data-test-subj': dataTestSubj,
  tooltip,
  label,
  disabled,
  paramName,
  value = false,
  setValue,
}: SwitchOptionProps<ParamName>) {
  return (
    <EuiFormRow fullWidth={true} display="rowCompressed">
      <EuiToolTip content={tooltip} delay="long" position="right">
        <EuiSwitch
          compressed={true}
          label={label}
          checked={value}
          disabled={disabled}
          data-test-subj={dataTestSubj}
          onChange={(ev) => setValue(paramName, ev.target.checked)}
        />
      </EuiToolTip>
    </EuiFormRow>
  );
}

export { SwitchOption };
