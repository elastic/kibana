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
 * Secondary menu header spacing.
 * Matches the App Header shell outer height: `standard` is 64px + thin border,
 * `compact` is 48px + thin border. Content is flex-centered for baseline alignment.
 */
export type SecondaryHeaderSpacing = 'standard' | 'compact';

/**
 * Menu header rendered above the scrolling menu body, so it stays in view.
 */
export function useMenuHeaderStyle(spacing: SecondaryHeaderSpacing = 'standard') {
  const { euiTheme } = useEuiTheme();

  const isCompact = spacing === 'compact';

  return css`
    --border-width: ${euiTheme.border.width.thin};
    // 20px is forced by section dividers
    --horizontal-padding: calc(20px - var(--border-width));

    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding: ${isCompact ? euiTheme.size.s : euiTheme.size.base} var(--horizontal-padding);
    // Match App Header shell outer height (49/65): content floor + thin border width, no hairline.
    min-height: calc(${isCompact ? '48px' : '64px'} + ${euiTheme.border.width.thin});

    & h4 {
      margin-block: 0;
      font-weight: ${euiTheme.font.weight.medium};
    }
  `;
}
