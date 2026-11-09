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
 * Set to `transparent` by the framed (project chrome) app wrapper in `@kbn/ui-chrome-layout`,
 * which paints the recessed glass itself.
 */
// POC: keep in sync with layout_application.styles.ts.
const RECESSED_SURFACE_VAR = '--kbn-recessed-surface';

/**
 * Recessed surface: transparent inside the project frame so its glass shows through,
 * solid `backgroundBaseRecessed` elsewhere (classic chrome).
 */
export const kbnRecessedGlassCss = ({ euiTheme }: UseEuiTheme): CSSObject => ({
  backgroundColor: `var(${RECESSED_SURFACE_VAR}, ${euiTheme.colors.backgroundBaseRecessed})`,
});
