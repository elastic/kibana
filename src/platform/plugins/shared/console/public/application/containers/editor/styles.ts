/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transparentize, useEuiTheme } from '@elastic/eui';
import { css as cssClassName } from '@emotion/css';
import { css } from '@emotion/react';

export const useActionStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    actions: css`
      position: absolute;
      z-index: ${euiTheme.levels.header};
      top: 0;
      // Adjust for possible scrollbars
      right: ${euiTheme.size.base};
      height: ${euiTheme.size.l};
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
      border-radius: ${euiTheme.size.xs};
      box-shadow: 0 0 calc(${euiTheme.size.xs} * 0.5) calc(${euiTheme.size.xs} * 0.5)
        ${euiTheme.colors.lightShade};
      padding-top: calc(${euiTheme.size.base} * 0.1);
      overflow-y: auto;

      button {
        height: calc(${euiTheme.size.base} * 1.1);
        width: calc(${euiTheme.size.base} * 1.1);
      }
    `,
  };
};

export const useHighlightedLinesClassName = () => {
  const { euiTheme } = useEuiTheme();
  return cssClassName`
    position: relative;
    padding: ${euiTheme.size.xs}; /* Adds space between border and text */

    &::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: calc(-${euiTheme.size.base} * 0.1);
      left: calc(-${euiTheme.size.base} * 0.5);
      right: 0;
      background: ${transparentize(euiTheme.colors.primary, 0.05)};
      border: ${euiTheme.border.thin};
      border-color: ${euiTheme.colors.primary};
      pointer-events: none; /* Ensures the pseudo-element doesn't block interactions */
    }
  `;
};
