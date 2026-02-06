/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiSwitch } from '@elastic/eui';

export interface FlyoutOwnFocusSwitchProps {
  flyoutOwnFocus: boolean;
  onChange: (ownFocus: boolean) => void;
  label?: string;
  disabled?: boolean;
}

/**
 * Shared switch component for toggling the ownFocus behavior of flyouts
 */
export const FlyoutOwnFocusSwitch: React.FC<FlyoutOwnFocusSwitchProps> = ({
  flyoutOwnFocus,
  onChange,
  label = 'Own Focus',
  disabled = false,
}) => {
  return (
    <EuiSwitch
      label={label}
      checked={flyoutOwnFocus}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
    />
  );
};
