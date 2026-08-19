/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ColorMode } from '@elastic/eui';
import type { DesignExplorationKnobTokens } from './design_exploration_knobs';

const INTERBANA_VARIANT_ID = 'interbana';
const NIRBANA_VARIANT_ID = 'nirbana';
const TARGET_VARIANT_ID = 'target';
const VERBANA_VARIANT_ID = 'verbana';
const LINBANA_VARIANT_ID = 'linbana';
const ATTBANA_VARIANT_ID = 'attbana';

const DARK_SHELL_SHADOW =
  '0 0 0 1px rgba(255, 255, 255, 0.06), 0px 2px 8px rgba(0, 0, 0, 0.35)';

/** Bespoke exploration colors — not EUI tokens. Resolved by the dev-toolbar color theme toggle. */
export interface DesignExplorationSurfacePalette {
  canvas: string;
  surface?: string;
  surfaceNav?: string;
  shellShadow?: string;
}

export interface DesignExplorationBespokePalette extends DesignExplorationSurfacePalette {
  borderSubdued?: string;
  textSubdued?: string;
  textNav?: string;
}

export const DESIGN_EXPLORATION_BESPOKE_CSS_VAR_NAMES = {
  borderSubdued: '--design-exploration-border-subdued',
  textSubdued: '--design-exploration-text-subdued',
  textNav: '--design-exploration-text-nav',
} as const;

export type DesignExplorationBespokeCssVar = keyof typeof DESIGN_EXPLORATION_BESPOKE_CSS_VAR_NAMES;

export const designExplorationBespokeVar = (token: DesignExplorationBespokeCssVar) =>
  `var(${DESIGN_EXPLORATION_BESPOKE_CSS_VAR_NAMES[token]})`;

const INTERBANA_BESPOKE_COLORS: Record<ColorMode, DesignExplorationBespokePalette> = {
  LIGHT: {
    canvas: '#EBEEF4',
    surface: '#FFFFFF',
    surfaceNav: '#F8F9FB',
    borderSubdued: 'rgba(81, 99, 129, 0.22)',
    textSubdued: 'rgba(81, 99, 129, 0.7)',
    textNav: '#333333',
    shellShadow: '0px 1px 4px 0px rgba(20, 20, 20, 0.15)',
  },
  DARK: {
    canvas: '#0B0F17',
    surface: '#161B22',
    surfaceNav: '#14171d',
    borderSubdued: 'rgba(255, 255, 255, 0.08)',
    textSubdued: 'rgba(139, 155, 180, 0.75)',
    textNav: '#E2E8F0',
    shellShadow: DARK_SHELL_SHADOW,
  },
};

const VERBANA_BESPOKE_COLORS: Partial<Record<ColorMode, DesignExplorationBespokePalette>> = {
  LIGHT: {
    canvas: '#ECEFF4',
    surface: '#FFFFFF',
    surfaceNav: '#F4F6FA',
    shellShadow: '0px 1px 3px 0px rgba(20, 20, 20, 0.08)',
  },
};

const LINBANA_BESPOKE_COLORS: Record<ColorMode, DesignExplorationBespokePalette> = {
  LIGHT: {
    canvas: '#F3F4F8',
    surface: '#FAFAFC',
    surfaceNav: '#F3F4F8',
    shellShadow: 'none',
  },
  DARK: {
    canvas: '#0F1117',
    surface: '#17191F',
    surfaceNav: '#0F1117',
    shellShadow: 'none',
  },
};

const ATTBANA_BESPOKE_COLORS: Record<ColorMode, DesignExplorationBespokePalette> = {
  LIGHT: {
    ...LINBANA_BESPOKE_COLORS.LIGHT,
    surfaceNav: LINBANA_BESPOKE_COLORS.LIGHT.canvas,
  },
  DARK: {
    ...LINBANA_BESPOKE_COLORS.DARK,
    surfaceNav: LINBANA_BESPOKE_COLORS.DARK.canvas,
  },
};

const NIRBANA_BESPOKE_COLORS: Record<ColorMode, DesignExplorationBespokePalette> = {
  LIGHT: {
    ...INTERBANA_BESPOKE_COLORS.LIGHT,
    canvas: '#EAEDF5',
  },
  DARK: {
    ...INTERBANA_BESPOKE_COLORS.DARK,
  },
};

const TARGET_BESPOKE_COLORS: Record<ColorMode, DesignExplorationBespokePalette> = {
  LIGHT: {
    ...NIRBANA_BESPOKE_COLORS.LIGHT,
  },
  DARK: {
    // Keep the exploration canvas; other dark surfaces use Borealis in the variant styles.
    canvas: '#09121E',
  },
};

const BESPOKE_COLORS_BY_VARIANT: Record<
  string,
  Partial<Record<ColorMode, DesignExplorationBespokePalette>>
> = {
    [INTERBANA_VARIANT_ID]: INTERBANA_BESPOKE_COLORS,
    [NIRBANA_VARIANT_ID]: NIRBANA_BESPOKE_COLORS,
    [TARGET_VARIANT_ID]: TARGET_BESPOKE_COLORS,
    [VERBANA_VARIANT_ID]: VERBANA_BESPOKE_COLORS,
    [LINBANA_VARIANT_ID]: LINBANA_BESPOKE_COLORS,
    [ATTBANA_VARIANT_ID]: ATTBANA_BESPOKE_COLORS,
  };

const getBespokePalette = (
  variantId: string,
  colorMode: ColorMode
): DesignExplorationBespokePalette | undefined => BESPOKE_COLORS_BY_VARIANT[variantId]?.[colorMode];

export const resolveDesignExplorationKnobTokensForColorMode = (
  tokens: DesignExplorationKnobTokens,
  variantId: string,
  colorMode: ColorMode
): DesignExplorationKnobTokens => {
  const palette = getBespokePalette(variantId, colorMode);

  if (!palette) {
    return tokens;
  }

  return {
    ...tokens,
    ...(palette.canvas !== undefined && { canvas: palette.canvas }),
    ...(palette.surface !== undefined && { surface: palette.surface }),
    ...(palette.surfaceNav !== undefined && { surfaceNav: palette.surfaceNav }),
    ...(palette.shellShadow !== undefined && { shellShadow: palette.shellShadow }),
  };
};

export const resolveDesignExplorationBespokeCssVars = (
  variantId: string,
  colorMode: ColorMode
): Record<string, string> => {
  const palette = getBespokePalette(variantId, colorMode);

  if (!palette) {
    return {};
  }

  const cssVars: Record<string, string> = {};

  if (palette.borderSubdued) {
    cssVars[DESIGN_EXPLORATION_BESPOKE_CSS_VAR_NAMES.borderSubdued] = palette.borderSubdued;
  }

  if (palette.textSubdued && palette.textNav) {
    cssVars[DESIGN_EXPLORATION_BESPOKE_CSS_VAR_NAMES.textSubdued] = palette.textSubdued;
    cssVars[DESIGN_EXPLORATION_BESPOKE_CSS_VAR_NAMES.textNav] = palette.textNav;
  }

  return cssVars;
};
