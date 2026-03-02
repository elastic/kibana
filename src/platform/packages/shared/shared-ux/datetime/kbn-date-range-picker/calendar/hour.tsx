/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type ReactNode } from 'react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { useHourStyles } from './hour.styles';

interface HourProps {
  children: ReactNode;
  onClick: () => void;
  isSelected?: boolean;
}

export function Hour({ children, onClick, isSelected = false }: HourProps) {
  const styles = useHourStyles();

  const commonProps = useMemo(
    () => ({
      size: 's' as const,
      textProps: false as const,
      onClick,
    }),
    [onClick]
  );

  if (isSelected) {
    return (
      <EuiButton
        {...commonProps}
        fill
        fullWidth={false}
        color="primary"
        css={styles.selectedButton}
      >
        {children}
      </EuiButton>
    );
  }

  return (
    <EuiButtonEmpty {...commonProps} css={styles.emptyButton}>
      {children}
    </EuiButtonEmpty>
  );
}
