/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';

const cssToken = (value: string | number | undefined, fallback: string): string =>
  value == null || value === '' ? fallback : String(value);

export interface MotionTokens {
  drift: string;
  opacityDuration: string;
  transformDuration: string;
  popoverEasing: string;
  tooltipDelay: string;
  tabDuration: string;
  tabEasing: string;
  indicatorColor: string;
  indicatorDisabledColor: string;
  indicatorThickness: string;
  accordionDuration: string;
  accordionEasing: string;
  calloutDuration: string;
  calloutEasing: string;
  pageEasing: string;
  pageRise: string;
  spinnerPrimary: string;
  spinnerTeal: string;
}

/** Resolves the motion-study tokens from the active EUI theme. */
export const resolveMotionTokens = (
  euiTheme: EuiThemeComputed,
  highContrastMode: boolean
): MotionTokens => {
  const slow = cssToken(euiTheme.animation.slow, '350ms');
  const normal = cssToken(euiTheme.animation.normal, '250ms');
  const extraFast = cssToken(euiTheme.animation.extraFast, '90ms');
  const resistance = cssToken(euiTheme.animation.resistance, 'cubic-bezier(.32, .72, 0, 1)');
  const underline = cssToken(euiTheme.border.width.thick, '2px');

  return {
    drift: cssToken(euiTheme.size.s, '8px'),
    opacityDuration: slow,
    transformDuration: `calc(${slow} + 100ms)`,
    popoverEasing: cssToken(euiTheme.animation.bounce, 'cubic-bezier(.34, 1.61, .7, 1)'),
    tooltipDelay: extraFast,
    tabDuration: slow,
    tabEasing: resistance,
    indicatorColor: euiTheme.colors.primary,
    indicatorDisabledColor: euiTheme.colors.textDisabled,
    indicatorThickness: highContrastMode ? `calc(${underline} * 2)` : underline,
    accordionDuration: normal,
    accordionEasing: resistance,
    calloutDuration: normal,
    calloutEasing: resistance,
    pageEasing: resistance,
    pageRise: '2px',
    spinnerPrimary: cssToken(euiTheme.colors.borderStrongPrimary, euiTheme.colors.primary),
    spinnerTeal: cssToken(
      euiTheme.colors.borderStrongAccentSecondary,
      euiTheme.colors.accentSecondary
    ),
  };
};
