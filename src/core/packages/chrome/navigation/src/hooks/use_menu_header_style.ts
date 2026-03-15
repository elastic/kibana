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
 * We cannot apply border to the header because we need to account for the scrollbar.
 */
export function useMenuHeaderStyle() {
  const { euiTheme } = useEuiTheme();

  return css`
    --border-width: ${euiTheme.border.width.thin};
    // 20px is forced by section dividers
    --horizontal-padding: calc(20px - var(--border-width));

    position: sticky;
    top: 0;
    z-index: 1;
    padding: ${euiTheme.size.base} var(--horizontal-padding) ${euiTheme.size.xs}
      var(--horizontal-padding);
    margin: 0 1px;
    height: var(--secondary-menu-header-height);
  `;
}
