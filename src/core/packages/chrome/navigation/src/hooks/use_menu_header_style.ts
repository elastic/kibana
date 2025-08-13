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
 * There is a requirement for the menu header to have a sticky position.
 * `z-index: 1` causes the `1px` border in dark mode to be underneath the header.
 * We cannot apply border to the header because we need to account for the scrollbar.
 *
 * TODO: Likely, this needs to be revisited in the future within EUI components to avoid
 * the hack and assure consistency.
 */
export function useMenuHeaderStyle() {
  const { euiTheme, colorMode } = useEuiTheme();

  const paddingTop =
    colorMode === 'DARK' ? `calc(${euiTheme.size.base} - var(--border-width))` : euiTheme.size.base;

  return css`
    --border-width: 1px;
    // 20px is forced by section dividers
    --horizontal-padding: calc(20px - var(--border-width));
    position: sticky;
    top: ${colorMode === 'DARK' ? 'var(--border-width)' : '0'};
    z-index: 1;
    padding: ${paddingTop} var(--horizontal-padding) ${euiTheme.size.xs} var(--horizontal-padding);
    margin: 0 1px;
  `;
}
