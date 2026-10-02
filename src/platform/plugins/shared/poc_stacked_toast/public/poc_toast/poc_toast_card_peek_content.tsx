/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIcon, type IconType, type UseEuiTheme } from '@elastic/eui';
import type { PocToast } from './poc_toast_types';
import { pocToastCardPeekStyles } from './poc_toast_styles';

const iconByType: Record<PocToast['type'], IconType> = {
  info: 'info',
  warning: 'warning',
  error: 'error',
};

const colorByType: Record<PocToast['type'], string> = {
  info: 'primary',
  warning: 'warning',
  error: 'danger',
};

export interface PocToastCardPeekContentProps {
  toast: PocToast;
  euiThemeContext: UseEuiTheme;
}

export const PocToastCardPeekContent = ({ toast, euiThemeContext }: PocToastCardPeekContentProps) => (
  <div css={pocToastCardPeekStyles(euiThemeContext)}>
    <span className="pocToastCardIcon">
      <EuiIcon type={iconByType[toast.type]} color={colorByType[toast.type]} size="m" />
    </span>
    <p className="pocToastCardTitle">{toast.title}</p>
  </div>
);
