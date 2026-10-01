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
 * Matches the App Header standard shell outer height (64px + thin border).
 * Content is flex-centered for baseline alignment.
 */
export function useMenuHeaderStyle() {
  const { euiTheme } = useEuiTheme();

  return css`
    --border-width: ${euiTheme.border.width.thin};
    // 20px is forced by section dividers
    --horizontal-padding: calc(20px - var(--border-width));

    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding: ${euiTheme.size.base} var(--horizontal-padding);
    // Match App Header standard shell outer height (65): content floor + thin border, no hairline.
    min-height: calc(64px + ${euiTheme.border.width.thin});

    & h4 {
      margin-block: 0;
      font-weight: ${euiTheme.font.weight.medium};
    }
  `;
}
