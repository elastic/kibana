/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Stub for `@kbn/core-chrome-layout-utils`.
 *
 * Inlines the pure EUI-theme-based helpers the navigation depends on so the
 * standalone bundle does not reach back into the Kibana source tree at build
 * time. Kept byte-for-byte in sync with the upstream implementation.
 */

import type { UseEuiTheme } from '@elastic/eui';

export const getHighContrastBorder = (euiThemeContext: UseEuiTheme): string => {
  const { euiTheme, highContrastMode } = euiThemeContext;

  if (highContrastMode) {
    return `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`;
  }
  if (euiThemeContext.colorMode === 'DARK') {
    const borderThin = euiTheme.border.thin;
    return borderThin ? String(borderThin) : 'none';
  }
  return 'none';
};

export interface HighContrastSeparatorOptions {
  side?: 'top' | 'bottom';
  width?: string;
  left?: string;
  right?: string;
}

export const getHighContrastSeparator = (
  euiThemeContext: UseEuiTheme,
  options: HighContrastSeparatorOptions = {}
): string => {
  const { euiTheme, highContrastMode } = euiThemeContext;

  const { side = 'bottom', width = euiTheme.size.xl, left = '0', right = '0' } = options;

  const borderSide = side === 'top' ? 'border-top' : 'border-bottom';

  if (highContrastMode) {
    return `
      ${borderSide}: ${euiTheme.border.width.thin} solid ${euiTheme.border.color};
    `;
  }

  return `
    &::${side === 'top' ? 'before' : 'after'} {
      content: '';
      position: absolute;
      ${side}: 0;
      left: ${left};
      right: ${right};
      width: ${width};
      margin: 0 auto;
      height: ${euiTheme.border.width.thin};
      background-color: ${euiTheme.colors.borderBaseSubdued};
    }
  `;
};
