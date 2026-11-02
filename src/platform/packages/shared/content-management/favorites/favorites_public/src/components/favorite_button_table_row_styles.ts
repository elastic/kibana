/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { euiCanAnimate } from '@elastic/eui';
import { css } from '@emotion/react';

/**
 * CSS to apply to a `EuiBasicTable` row container to show the favorite button
 * on hover or when active.
 *
 * Extracted to its own module (no React, no `FavoriteButton` import) so
 * consumers that only need the row-hover style don't drag the whole
 * `FavoriteButton` + `StardustWrapper` graph into their bundle.
 *
 * @param euiTheme - resolved EUI theme, typically from `useEuiTheme()`.
 */
export const cssFavoriteHoverWithinEuiTableRow = (euiTheme: EuiThemeComputed) => css`
  @media (hover: hover) {
    .euiTableRow .cm-favorite-button--empty {
      visibility: hidden;
      opacity: 0;
      ${euiCanAnimate} {
        transition: opacity ${euiTheme.animation.fast} ${euiTheme.animation.resistance};
      }
    }
    .euiTableRow:hover,
    .euiTableRow:focus-within {
      .cm-favorite-button--empty {
        visibility: visible;
        opacity: 1;
      }
    }
  }
`;
