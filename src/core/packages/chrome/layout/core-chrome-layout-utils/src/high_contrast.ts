/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';

/**
 * Helper function to get container border styles for high contrast mode.
 * In high contrast mode, renders a solid border. Otherwise, renders based on color mode.
 *
 * @param euiThemeContext - EUI theme context
 * @param highContrastMode - High contrast mode setting
 * @returns CSS border string
 */
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
  /** The side to place the border separator ('top' or 'bottom'). Default: 'bottom' */
  side?: 'top' | 'bottom';
  /** Width of the separator line. Default: theme.size.xl */
  width?: string;
  /** Left position for the separator. Default: '0' */
  left?: string;
  /** Right position for the separator. Default: '0' */
  right?: string;
}

/**
 * Helper function to get separator border styles for high contrast mode.
 * In high contrast mode, renders a real border. Otherwise, renders a pseudo-element with subdued styling.
 *
 * @param euiTheme - EUI theme object
 * @param highContrastMode - High contrast mode setting
 * @param options - Configuration options for the separator
 * @returns CSS string for the separator
 */
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
