/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiSwitch } from '@elastic/eui';
import { useSerializableState } from './serializable_state';

interface Props {
  label?: string;
  disabled?: boolean;
  compressed?: boolean;
  iconType?: string;
  mini?: boolean;
  noLabel?: boolean;
}

export const SwitchRegular = ({
  label = 'Malware protection',
  disabled = false,
  compressed = false,
  mini = false,
  noLabel = false,
}: Props) => {
  const [checked, setChecked] = useSerializableState('checked', false);

  const handleChange = (e: EuiSwitchEvent) => {
    setChecked(e.target.checked);
  };

  return (
    <EuiSwitch
      label={label}
      checked={checked}
      onChange={handleChange}
      disabled={disabled}
      compressed={compressed}
      mini={mini}
      showLabel={!noLabel ? undefined : false}
    />
  );
};

export const SwitchDisabled = () => <SwitchRegular disabled />;

export const SwitchCompressed = () => <SwitchRegular compressed />;

export const SwitchMini = () => <SwitchRegular mini />;

export const SwitchNoLabel = () => <SwitchRegular noLabel />;
