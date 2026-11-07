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

// POC: approximates the Figma glass effect (Frost, Light -45°); refraction and dispersion are not reproduced.
const RECESSED_GLASS_FILL_ALPHA = 0.77;
// POC: lighter than Figma's Frost 4; 4px blur smears the 2px ambient dots into a flat tint.
const RECESSED_GLASS_BLUR = '1px';

/** Marker class for glass surfaces; the framed app wrapper in `@kbn/ui-chrome-layout` drops its fill when it contains one. */
export const KBN_RECESSED_GLASS_CLASS = 'kbnRecessedGlass';

/** Frosted glass treatment for surfaces using the `backgroundBaseRecessed` color. */
export const kbnRecessedGlassCss = ({ euiTheme }: UseEuiTheme): CSSObject => ({
  backgroundColor: transparentize(
    euiTheme.colors.backgroundBaseRecessed,
    RECESSED_GLASS_FILL_ALPHA
  ),
  backdropFilter: `blur(${RECESSED_GLASS_BLUR})`,
  // POC: needs design input — one step lighter than recessed in both themes, so the edge stays subtle in dark mode.
  boxShadow: `inset 1px 1px 0 ${euiTheme.colors.backgroundBasePlain}`,
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
