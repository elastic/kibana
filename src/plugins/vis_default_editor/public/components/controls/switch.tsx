/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiFormRow, EuiSwitch, EuiToolTip } from '@elastic/eui';

import { AggParamEditorProps } from '../agg_param_props';

interface SwitchParamEditorProps extends AggParamEditorProps<boolean> {
  dataTestSubj?: string;
  displayLabel?: string;
  displayToolTip?: string;
  disabled?: boolean;
}

function SwitchParamEditor({
  value = false,
  setValue,
  dataTestSubj,
  displayToolTip,
  displayLabel,
  disabled,
}: SwitchParamEditorProps) {
  return (
    <EuiFormRow fullWidth={true}>
      <EuiToolTip content={displayToolTip} delay="long" position="right">
        <EuiSwitch
          compressed={true}
          label={displayLabel}
          checked={value}
          disabled={disabled}
          data-test-subj={dataTestSubj}
          onChange={(ev) => setValue(ev.target.checked)}
        />
      </EuiToolTip>
    </EuiFormRow>
  );
}

export { SwitchParamEditor };
