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

export interface FlyoutTypeSwitchProps {
  flyoutType: 'overlay' | 'push';
  onChange: (type: 'overlay' | 'push') => void;
  label?: string;
}

/**
 * Shared switch component for toggling between overlay and push flyout types
 */
export const FlyoutTypeSwitch: React.FC<FlyoutTypeSwitchProps> = ({
  flyoutType,
  onChange,
  label = 'Push',
}) => {
  return (
    <EuiSwitch
      label={label}
      checked={flyoutType === 'push'}
      onChange={(e) => onChange(e.target.checked ? 'push' : 'overlay')}
    />
  );
};
