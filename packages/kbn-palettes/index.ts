/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chroma from 'chroma-js';
import { euiPaletteColorBlind as euiPaletteColorBlindReal } from '@elastic/eui';
import { ELASTIC_PALETTE_COLORS } from './colors';

export function euiPaletteColorBlind(options: Parameters<typeof euiPaletteColorBlindReal>[0] = {}) {
  const n = (options.rotations ?? 1) * 10; // 10 colors per rotation
  const loops = Math.ceil(n / ELASTIC_PALETTE_COLORS.length);

  return Array.from({ length: loops })
    .flatMap(() => ELASTIC_PALETTE_COLORS)
    .slice(0, n);
}
export const euiPaletteColorBlindBehindText = euiPaletteColorBlind;

function createGradientPaletteFromColors(colors: string[]) {
  return (n: number) => chroma.scale(colors).mode('lab').colors(n);
}

export const euiPaletteForStatus = createGradientPaletteFromColors([
  '#00BD79',
  '#FFD569',
  '#F66D64',
]);

export const euiPaletteForTemperature = createGradientPaletteFromColors([
  '#599DFF',
  '#F6F9FC',
  '#F66D64',
]);

export const euiPaletteComplementary = createGradientPaletteFromColors([
  '#599DFF',
  '#F6F9FC',
  '#ED9E00',
]);

export const euiPaletteRed = createGradientPaletteFromColors(['#F6F9FC', '#F66D64']);

export const euiPaletteGreen = createGradientPaletteFromColors(['#F6F9FC', '#00BD79']);

export const euiPaletteCool = createGradientPaletteFromColors(['#F6F9FC', '#599DFF']);

// export const euiPaletteWarm = createGradientPaletteFromColors([]);

export const euiPaletteGray = createGradientPaletteFromColors(['#F6F9FC', '#89A0C4']);
