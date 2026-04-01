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
import { HardcodedIcons } from '../../../shared/ui/step_icons/hardcoded_icons';

export function getBaseTypeIconsStyles(euiThemeContext: UseEuiTheme) {
  const { euiTheme } = euiThemeContext;
  const borderColor = euiTheme.colors.vis.euiColorVis2;

  return css`
    .type-decoration {
      margin-left: 4px;
      pointer-events: none;
      user-select: none;
      display: inline-block;
      position: relative;
      opacity: 0.8;
    }

    /* !important needed on type-inline-highlight rules to override Monaco inline styles */
    .type-inline-highlight {
      background-color: ${transparentize(euiTheme.colors.primary, 0.06)} !important;
      border-radius: 3px !important;
      padding: 1px 3px !important;
      border: 1px solid ${borderColor} !important;
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

    /* Tech preview: flask icon + full-height separator inside the highlight box */
    .type-inline-highlight.type-tech-preview {
      padding-right: 24px !important;
      position: relative !important;
    }

    .type-inline-highlight.type-tech-preview::before {
      content: '';
      position: absolute;
      right: 0;
      top: -1px;
      bottom: -1px;
      width: 20px;
      background: linear-gradient(${borderColor}, ${borderColor}) no-repeat left / 1px 100%,
        ${euiTheme.colors.textPrimary};
      /* Two mask layers composited: 1px separator line + flask icon */
      mask-image: linear-gradient(#000, #000), url('${HardcodedIcons.flask}');
      mask-size: 1px 100%, 11px 11px;
      mask-repeat: no-repeat;
      mask-position: left center, center center;
      mask-composite: add;
      -webkit-mask-composite: source-over;
    }
  `;
}
