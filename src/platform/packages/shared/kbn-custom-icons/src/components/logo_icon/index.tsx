/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiIconProps } from '@elastic/eui';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import type { LogoName } from './get_logo_icon';
import { getLogoIcon } from './get_logo_icon';

export interface LogoIconProps extends Omit<EuiIconProps, 'type'> {
  logoName?: LogoName;
}

export function LogoIcon({ logoName, size = 'l', ...props }: LogoIconProps) {
  const theme = useEuiTheme();
  const icon = getLogoIcon(logoName, theme.colorMode === 'DARK');

  return <EuiIcon type={icon} size={size} title={logoName} {...props} />;
}
