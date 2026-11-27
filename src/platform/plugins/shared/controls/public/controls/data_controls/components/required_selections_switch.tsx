/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';

import { EuiSwitch } from '@elastic/eui';
import { DEFAULT_DATA_CONTROL_STATE } from '@kbn/controls-constants';

import { ControlSettingTooltipLabel } from '../../../control_group/components/control_setting_tooltip_label';
import type { CustomOptionsComponentProps } from '../types';

type Props = Pick<CustomOptionsComponentProps, 'initialState' | 'updateState'> & {
  label: string;
  tooltip: string;
  'data-test-subj': string;
};

export const RequiredSelectionsSwitch: React.FC<Props> = ({
  initialState,
  updateState,
  label,
  tooltip,
  'data-test-subj': dataTestSubj,
}) => {
  const [required, setRequired] = useState<boolean>(
    initialState.required ?? DEFAULT_DATA_CONTROL_STATE.required
  );
  return (
    <EuiSwitch
      compressed
      label={<ControlSettingTooltipLabel label={label} tooltip={tooltip} />}
      checked={required}
      onChange={() => {
        const newRequired = !required;
        setRequired(newRequired);
        updateState({ required: newRequired });
      }}
      data-test-subj={dataTestSubj}
    />
  );
};
