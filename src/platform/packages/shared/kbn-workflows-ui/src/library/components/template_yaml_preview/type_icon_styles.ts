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

/**
 * Base styling for the inline `type:` highlight the decorations add, matching
 * the workflow editor: a subtle rounded "pill" around the type value plus the
 * `::after` box the per-type icon CSS fills with a `background-image`.
 */
export const getTypeIconBaseStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;
  const borderColor = euiTheme.colors.vis.euiColorVis2;

  return css`
    /* !important needed to override Monaco inline styles on decoration spans */
    .monaco-editor .view-line span.type-inline-highlight {
      background-color: ${transparentize(euiTheme.colors.primary, 0.06)} !important;
      border-radius: 3px !important;
      padding: 1px 3px !important;
      border: 1px solid ${borderColor} !important;
    }

    .monaco-editor .view-line span.type-inline-highlight::after {
      content: '';
      display: inline-block;
      width: 12px;
      height: 12px;
      margin-left: 4px;
      vertical-align: middle;
      position: relative;
      top: -1px;
      color: ${euiTheme.colors.textParagraph};
      background-size: contain;
      background-repeat: no-repeat;
    }
  `;
};
