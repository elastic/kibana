/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Packaging stub for `@kbn/core-chrome-layout-utils`.
 *
 * WHY: source files under `../../src/` import from `@kbn/core-chrome-layout-utils`.
 * That package lives in the Kibana monorepo and is not published to npm, so it cannot
 * resolve when the tarball is consumed externally (e.g. by Cloud UI).
 *
 * HOW: this file is aliased over the real import at build time by:
 *   - `packaging/tsconfig.json`      → `compilerOptions.paths`
 *   - `packaging/webpack.config.js`  → `resolve.alias`
 * Kibana itself never compiles this file — it only applies during the packaging build.
 *
 * SCOPE: trimmed copy. Only `getHighContrastBorder` and `getHighContrastSeparator`
 * from `high_contrast.ts` are re-exported here. `scroll.ts` (scroll-container helpers)
 * is intentionally omitted — chrome-layout doesn't depend on it at the packaged
 * boundary. Upstream source of truth:
 *   src/core/packages/chrome/layout/core-chrome-layout-utils/src/high_contrast.ts
 *
 * MAINTENANCE: if a source file under `../../src/` begins importing a symbol not
 * listed here, add it — otherwise the packaging type-validation step will fail.
 */

import type { UseEuiTheme } from '@elastic/eui';

export const getHighContrastBorder = (euiThemeContext: UseEuiTheme): string => {
  const { euiTheme, highContrastMode } = euiThemeContext;

  if (highContrastMode) {
    return `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`;
  }
  if (euiThemeContext.colorMode === 'DARK') {
    const borderThin = euiTheme.border.thin;
    return borderThin ? String(borderThin) : 'none';
  }
  return 'none';
};

export interface HighContrastSeparatorOptions {
  side?: 'top' | 'bottom';
  width?: string;
  left?: string;
  right?: string;
}

export const getHighContrastSeparator = (
  euiThemeContext: UseEuiTheme,
  options: HighContrastSeparatorOptions = {}
): string => {
  const { euiTheme, highContrastMode } = euiThemeContext;

  const { side = 'bottom', width = euiTheme.size.xl, left = '0', right = '0' } = options;

  const borderSide = side === 'top' ? 'border-top' : 'border-bottom';

  if (highContrastMode) {
    return `
      ${borderSide}: ${euiTheme.border.width.thin} solid ${euiTheme.border.color};
    `;
  }

  return `
    &::${side === 'top' ? 'before' : 'after'} {
      content: '';
      position: absolute;
      ${side}: 0;
      left: ${left};
      right: ${right};
      width: ${width};
      margin: 0 auto;
      height: ${euiTheme.border.width.thin};
      background-color: ${euiTheme.colors.borderBaseSubdued};
    }
  `;
};
