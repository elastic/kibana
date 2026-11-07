/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CSSObject } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';
import { transparentize } from '@elastic/eui';

// POC: approximates the Figma glass effect (Frost 4, Light -45° / 80%); refraction and dispersion are not reproduced.
const RECESSED_GLASS_FILL_ALPHA = 0.77;
const RECESSED_GLASS_BLUR = '4px';
// POC: needs design input on highlight strength.
const RECESSED_GLASS_HIGHLIGHT_ALPHA = 0.8;

/** Frosted glass treatment for surfaces using the `backgroundBaseRecessed` color. */
export const kbnRecessedGlassCss = ({ euiTheme }: UseEuiTheme): CSSObject => ({
  backgroundColor: transparentize(
    euiTheme.colors.backgroundBaseRecessed,
    RECESSED_GLASS_FILL_ALPHA
  ),
  backdropFilter: `blur(${RECESSED_GLASS_BLUR})`,
  boxShadow: `inset 1px 1px 0 ${transparentize(
    euiTheme.colors.plainLight,
    RECESSED_GLASS_HIGHLIGHT_ALPHA
  )}`,
  '@media (prefers-reduced-transparency: reduce)': {
    backgroundColor: euiTheme.colors.backgroundBaseRecessed,
    backdropFilter: 'none',
  },
});

/** Resets the glass treatment for variants that swap in an opaque background. */
export const kbnRecessedGlassResetCss: CSSObject = {
  backdropFilter: 'none',
  boxShadow: 'none',
};
