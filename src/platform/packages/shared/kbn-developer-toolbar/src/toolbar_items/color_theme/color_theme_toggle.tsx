/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';

interface Props {
  isDarkMode: boolean;
  onToggle: () => void;
}

export const ColorThemeToggle = ({ isDarkMode, onToggle }: Props) => (
  <EuiToolTip content="Click to toggle color theme.">
    <EuiBadge
      color={isDarkMode ? '#1E293B' : '#FEF3C7'}
      iconType={isDarkMode ? 'moon' : 'sun'}
      iconSide="left"
      onClick={onToggle}
      onClickAriaLabel="Toggle color theme"
    >
      {isDarkMode ? 'Dark' : 'Light'}
    </EuiBadge>
  </EuiToolTip>
);
