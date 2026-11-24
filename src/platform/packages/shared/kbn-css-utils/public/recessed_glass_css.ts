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

/**
 * Marker class that opts the framed (project chrome) app wrapper in `@kbn/ui-chrome-layout`
 * into painting the recessed glass. Always pair it with `kbnRecessedGlassCss`.
 */
// POC: keep in sync with layout_application.styles.ts.
export const KBN_RECESSED_GLASS_CLASS = 'kbnRecessedGlass';

/** Set to `transparent` by the framed app wrapper when it paints the recessed glass. */
const RECESSED_SURFACE_VAR = '--kbn-recessed-surface';

/**
 * Recessed surface: transparent inside the glass frame so its glass shows through,
 * solid `backgroundBaseRecessed` elsewhere (classic chrome).
 */
export const kbnRecessedGlassCss = ({ euiTheme }: UseEuiTheme): CSSObject => ({
  backgroundColor: `var(${RECESSED_SURFACE_VAR}, ${euiTheme.colors.backgroundBaseRecessed})`,
});
