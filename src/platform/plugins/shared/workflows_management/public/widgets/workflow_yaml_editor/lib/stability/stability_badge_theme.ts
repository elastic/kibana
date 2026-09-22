/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';

export interface StabilityBadgeColors {
  fill: string;
  stroke: string;
  text: string;
}

let stabilityBadgeThemeContext: UseEuiTheme | undefined;

/** Updated from the YAML editor so Monaco hover badges follow the active EUI theme. */
export function setStabilityBadgeThemeContext(context: UseEuiTheme): void {
  stabilityBadgeThemeContext = context;
}

/** @internal For unit tests only. */
export function resetStabilityBadgeThemeContextForTests(): void {
  stabilityBadgeThemeContext = undefined;
}

export function getStabilityBadgeColors(): StabilityBadgeColors {
  const { euiTheme } = stabilityBadgeThemeContext ?? {};
  if (!euiTheme) {
    throw new Error(
      'Stability badge theme is not initialized. Call setStabilityBadgeThemeContext from WorkflowYAMLEditor.'
    );
  }

  return {
    fill: euiTheme.colors.backgroundBasePlain,
    stroke: euiTheme.components.badgeBorderColorHollow,
    text: euiTheme.colors.textParagraph,
  };
}
