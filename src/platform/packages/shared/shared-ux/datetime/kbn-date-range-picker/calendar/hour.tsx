/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import { css } from '@emotion/react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';

interface HourProps {
  children: ReactNode;
  onClick: () => void;
  isSelected?: boolean;
}

export function Hour({ children, onClick, isSelected = false }: HourProps) {
  const buttonStyles = css`
    inline-size: 100%;
    min-block-size: 24px;
    block-size: 24px;
    font-size: 12px;
  `;

  if (isSelected) {
    return (
      <EuiButton size="s" fill color="primary" css={buttonStyles} onClick={onClick}>
        {children}
      </EuiButton>
    );
  }

  return (
    <EuiButtonEmpty size="s" css={buttonStyles} onClick={onClick}>
      {children}
    </EuiButtonEmpty>
  );
}
