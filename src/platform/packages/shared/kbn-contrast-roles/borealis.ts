/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Borealis: the input contrast roles are built for here, read from the same @elastic/eui-theme-borealis Kibana ships.
import { colorVisLight } from '@elastic/eui-theme-borealis';
import { euiDarkVars, euiLightVars } from '@kbn/ui-theme';
import { createContrastRoles, hexToOklch, type Hex, type Theme } from './src';

export type Mode = 'light' | 'dark';

// backgroundBasePlain per mode: what charts in panels sit on.
export const SURFACES: Readonly<Record<Mode, Hex>> = {
  light: euiLightVars.euiColorBackgroundBasePlain,
  dark: euiDarkVars.euiColorBackgroundBasePlain,
};

// Primitive purple60, for Borealis versions without a vis token for purple (euiColorVis10, added in elastic/eui PR
// #9383; 8.2.0 has it, with this same hex). Borealis doesn't export its primitives.
const PURPLE_60: Hex = '#B386F9';

const HUE_FAMILIES = ['teal', 'blue', 'pink', 'red', 'yellow', 'purple'] as const;
const visLight = colorVisLight as unknown as Record<string, Hex>;

// Per hue, in EUI order: base = euiColorVis(2i).
export const EUI_HUES: ReadonlyArray<{ name: string; base: Hex }> = HUE_FAMILIES.map((name, i) => ({
  name,
  base: visLight[`euiColorVis${2 * i}`] ?? PURPLE_60,
}));

// euiColorVisBase0: the neutral start / middle of EUI's gradient palettes.
export const VIS_BASE0: Hex = visLight.euiColorVisBase0;

// The theme contrast roles resolve against: both surfaces, each hue anchored on its /60, and Kibana's diverging middle
// tint for surfaces with no hue of their own (white).
export const BOREALIS_THEME: Theme = {
  surfaces: SURFACES,
  hues: EUI_HUES.map(({ name, base }) => ({ name, base })),
  neutralTint: VIS_BASE0,
};

export const borealis = createContrastRoles(BOREALIS_THEME);

// EUI's status palette stops, in order. Only their hue angles are used: the tokens' lightness varies (warning1 is a
// pale yellow), so their bases are modelled.
const STATUS_TOKENS = {
  success: 'euiColorVisSuccess0',
  warning: 'euiColorVisWarning1',
  danger: 'euiColorVisDanger0',
} as const;

// Success, warning and danger, for the status and positive palettes. The vis hues have no green.
export const borealisStatus = createContrastRoles({
  surfaces: SURFACES,
  hues: Object.entries(STATUS_TOKENS).map(([name, token]) => ({
    name,
    angle: hexToOklch(visLight[token]).h,
  })),
  neutralTint: VIS_BASE0,
});
