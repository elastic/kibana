/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EUI_PALETTE_COLORS_DARK, EUI_PALETTE_COLORS_LIGHT } from './eui';
import { TABLEAU_COLORS_DARK, TABLEAU_COLORS_LIGHT } from './tableau';
import { IKEA_COLORS_DARK, IKEA_COLORS_LIGHT } from './ikea';
import { PASTEL_PALETTE_DARK, PASTEL_PALETTE_LIGHT } from './pastel';
import { NEUTRAL_COLOR_DARK, NEUTRAL_COLOR_LIGHT } from './neutral';

import { ColorMapping } from '../config';

export const EUIPalette: ColorMapping.CategoricalPalette = {
  id: 'eui',
  name: 'EUI',
  colorCount: EUI_PALETTE_COLORS_LIGHT.length,
  type: 'categorical',
  getColor(valueInRange, isDarkMode) {
    return isDarkMode
      ? EUI_PALETTE_COLORS_DARK[valueInRange]
      : EUI_PALETTE_COLORS_LIGHT[valueInRange];
  },
};

export const TableauPalette: ColorMapping.CategoricalPalette = {
  id: 'tableau',
  name: 'Tableau',
  colorCount: TABLEAU_COLORS_LIGHT.length,
  type: 'categorical',
  getColor(valueInRange, isDarkMode) {
    return isDarkMode ? TABLEAU_COLORS_DARK[valueInRange] : TABLEAU_COLORS_LIGHT[valueInRange];
  },
};

export const IKEAPalette: ColorMapping.CategoricalPalette = {
  id: 'ikea',
  name: 'IKEA',
  colorCount: IKEA_COLORS_LIGHT.length,
  type: 'categorical',
  getColor(valueInRange, isDarkMode) {
    return isDarkMode ? IKEA_COLORS_DARK[valueInRange] : IKEA_COLORS_LIGHT[valueInRange];
  },
};

export const PastelPalette: ColorMapping.CategoricalPalette = {
  id: 'pastel',
  name: 'Pastel',
  colorCount: PASTEL_PALETTE_LIGHT.length,
  type: 'categorical',
  getColor(valueInRange, isDarkMode) {
    return isDarkMode ? PASTEL_PALETTE_DARK[valueInRange] : PASTEL_PALETTE_LIGHT[valueInRange];
  },
};

export const NeutralPalette: ColorMapping.CategoricalPalette = {
  id: 'neutral',
  name: 'Neutral',
  colorCount: NEUTRAL_COLOR_LIGHT.length,
  type: 'categorical',
  getColor(valueInRange, isDarkMode) {
    return isDarkMode ? NEUTRAL_COLOR_DARK[valueInRange] : NEUTRAL_COLOR_LIGHT[valueInRange];
  },
};

export function getPalette(
  palettes: Map<string, ColorMapping.CategoricalPalette>,
  defaultPalette: ColorMapping.CategoricalPalette
) {
  return (paletteId: string) => palettes.get(paletteId) ?? defaultPalette;
}
