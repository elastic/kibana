/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { transparentize } from '@elastic/eui';
import { css } from '@emotion/react';

export function getBaseTypeIconsStyles(euiThemeContext: UseEuiTheme) {
  const { euiTheme } = euiThemeContext;
  return css`
    /* Connector type decorations - GitLens style inline icons */
    .type-decoration {
      margin-left: 4px;
      pointer-events: none;
      user-select: none;
      display: inline-block;
      position: relative;
      opacity: 0.8;
    }

    /* Connector inline highlighting */
    .type-inline-highlight {
      background-color: ${transparentize(euiTheme.colors.primary, 0.06)} !important;
      border-radius: 3px !important;
      padding: 1px 3px !important;
      // eslint-disable-next-line @elastic/eui/no-css-color -- we need transparent color to avoid overlay text selection
      border: 1px solid ${euiTheme.colors.vis.euiColorVis2} !important;
    }

    .type-inline-highlight::after {
      content: '';
      display: inline-block;
      width: 12px;
      height: 12px;
      margin-left: 4px;
      vertical-align: middle;
      position: relative;
      top: -1px;
      color: ${euiTheme.colors.textParagraph};
    }
  `;
}
