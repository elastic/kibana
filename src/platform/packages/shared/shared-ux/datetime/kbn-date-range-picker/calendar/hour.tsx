/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import { useEuiTheme } from '@elastic/eui';

import { hourStyles } from './hour.styles';

interface HourProps {
  children: ReactNode;
  onClick: () => void;
}

export function Hour({ children, onClick }: HourProps) {
  const euiThemeContext = useEuiTheme();
  const styles = hourStyles(euiThemeContext);

  return (
    <button css={styles.button} onClick={onClick}>
      {children}
    </button>
  );
}
