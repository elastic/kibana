/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { APP_HEADER_ROW_HEIGHT } from '../constants';

/**
 * Menu header rendered above the scrolling menu body, so it stays in view.
 */
export function useMenuHeaderStyle(isPanel = false) {
  const { euiTheme } = useEuiTheme();
  const { fontSize, lineHeight } = useEuiFontSize('s');
  const panelStyles = css`
    padding-top: calc((${APP_HEADER_ROW_HEIGHT}px - ${lineHeight}) / 2);
  `;

  return css`
    --border-width: ${euiTheme.border.width.thin};
    // 20px is forced by section dividers
    --horizontal-padding: calc(20px - var(--border-width));

    flex-shrink: 0;
    padding: ${euiTheme.size.base} var(--horizontal-padding) ${euiTheme.size.xxs}
      var(--horizontal-padding);
    margin: 0 1px;
    ${isPanel && panelStyles}

    & h4 {
      font-size: ${fontSize};
      line-height: ${lineHeight};
    }
  `;
}
