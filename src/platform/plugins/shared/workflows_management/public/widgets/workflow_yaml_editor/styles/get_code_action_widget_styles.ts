/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiShadow, type UseEuiTheme } from '@elastic/eui';
import productAgentSvg from '@elastic/eui/lib/components/icon/svgs/product_agent.svg';
import { css } from '@emotion/react';
import { FIX_WITH_AI_LABEL } from '../lib/fix_with_ai_label';

// Monaco labels every quick fix row with the action title, which is the only hook for
// styling one row. JSON.stringify keeps the selector valid for any translation.
const fixWithAiRowSelector = `.monaco-list-row[aria-label=${JSON.stringify(FIX_WITH_AI_LABEL)}]`;

/**
 * Styles Monaco's code action (quick fix) widget like the workflow hover widgets, and gives
 * the "Fix with AI Agent" row the agent icon instead of Monaco's lightbulb.
 */
export const getCodeActionWidgetStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;
  return css`
    .monaco-editor .action-widget,
    .action-widget {
      border-radius: ${euiTheme.border.radius.medium} !important;
      ${euiShadow(euiThemeContext, 'm')}
      border-width: 0 !important;
      overflow: hidden !important;
    }

    /* Monaco overwrites the row icon's class with the codicon classes, so target those */
    .action-widget ${fixWithAiRowSelector} .codicon {
      /* The suppressed glyph leaves the element with no size of its own */
      display: inline-block;
      width: ${euiTheme.size.base};
      height: ${euiTheme.size.base};
      background-color: ${euiTheme.colors.textParagraph};
      mask-image: url('${productAgentSvg}');
      mask-size: contain;
      mask-repeat: no-repeat;
      mask-position: center;
    }

    /* Hide the lightbulb glyph the codicon font draws underneath the mask */
    .action-widget ${fixWithAiRowSelector} .codicon::before {
      content: none;
    }
  `;
};
