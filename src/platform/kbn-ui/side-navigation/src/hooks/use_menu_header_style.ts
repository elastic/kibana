/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

/**
 * Menu header rendered above the scrolling menu body, so it stays in view.
 *
 * @param isPanel - When true (side panel), matches the App Header standard shell
 *   height for baseline alignment. When false (popover), uses a compact height.
 */
export function useMenuHeaderStyle(isPanel: boolean = false) {
  const { euiTheme } = useEuiTheme();

  return css`
    --border-width: ${euiTheme.border.width.thin};
    // 20px is forced by section dividers
    --horizontal-padding: calc(20px - var(--border-width));

    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding: ${isPanel ? euiTheme.size.base : euiTheme.size.s} var(--horizontal-padding);
    // Panel: App Header standard shell (65). Popover: compact shell (49).
    min-height: calc(${isPanel ? '64px' : '48px'} + ${euiTheme.border.width.thin});

    & h4 {
      margin-block: 0;
      font-weight: ${euiTheme.font.weight.medium};
    }
  `;
}
