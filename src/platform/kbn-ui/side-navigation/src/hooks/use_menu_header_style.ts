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
 * `standard` matches the App Header standard inset; line-height aligns the `xs`
 * title baseline with the app header's `s` title.
 * `compact` matches the App Header compact layout (48px floor, 8px inset).
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

    flex-shrink: 0;
    padding: ${isCompact ? euiTheme.size.s : euiTheme.size.base} var(--horizontal-padding);
    margin: 0 1px;
    min-height: ${isCompact ? '48px' : '64px'};
    // Optical: secondary titles stay `xs` while App Header standard uses `s`.
    // 2.25em lowers the `xs` baseline to match the adjacent app-header title.
    ${!isCompact &&
    css`
      line-height: 2.25em;
    `}
  `;
}
