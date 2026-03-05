/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';

import { useHourStyles } from './hour.styles';

interface HourProps {
  children: ReactNode;
  onClick: () => void;
  isSelected?: boolean;
  /**
   * When true, the selected slot is a rounded approximation of a more precise time.
   * Renders with a light primary background instead of a filled one.
   * @default false
   */
  isApproximate?: boolean;
}

export function Hour({ children, onClick, isSelected = false, isApproximate = false }: HourProps) {
  const styles = useHourStyles();

  if (isSelected && isApproximate) {
    return (
      <EuiButton
        size="s"
        textProps={false}
        onClick={onClick}
        fullWidth={false}
        color="primary"
        css={styles.approximateButton}
        aria-current="true"
        data-approximate="true"
      >
        {children}
      </EuiButton>
    );
  }

  if (isSelected) {
    return (
      <EuiButton
        size="s"
        textProps={false}
        onClick={onClick}
        fill
        fullWidth={false}
        color="primary"
        css={styles.selectedButton}
        aria-current="true"
      >
        {children}
      </EuiButton>
    );
  }

  return (
    <EuiButtonEmpty size="s" textProps={false} onClick={onClick} css={styles.emptyButton}>
      {children}
    </EuiButtonEmpty>
  );
}
