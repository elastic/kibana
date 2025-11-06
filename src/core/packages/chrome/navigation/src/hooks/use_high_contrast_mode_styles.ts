/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const highContrastHoverStyle = ({ euiTheme }: UseEuiTheme) => `
    outline-color: var(--high-contrast-hover-indicator-color, ${euiTheme.border.color});
    outline-width: ${euiTheme.border.width.thin};
    outline-style: dashed;
    outline-offset: -${euiTheme.border.width.thin};
`;

/**
 * Hook to get the high contrast mode hover styles for buttons.
 *
 * @param selector - The selector to apply the high contrast mode hover styles to.
 * @returns The high contrast mode hover styles.
 */
export const useHighContrastModeStyles = (selector: string = '') => {
  const euiThemeContext = useEuiTheme();
  const { highContrastMode } = euiThemeContext;

  const styles = {
    preferred: css`
      border: ${euiThemeContext.euiTheme.border.width.thin} solid transparent;
      transition: none;

      &:hover ${selector} {
        ${highContrastHoverStyle(euiThemeContext)}
      }
    `,
    forced: css`
      border: none;

      &:hover ${selector} {
        ${highContrastHoverStyle(euiThemeContext)}
      }
    `,
  };

  return highContrastMode ? styles[highContrastMode] : undefined;
};
