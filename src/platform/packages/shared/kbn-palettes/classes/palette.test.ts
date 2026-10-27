/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EUI_VIS_COLOR_STORE, euiPaletteColorBlind } from '@elastic/eui';
import { KbnCategoricalPalette } from './categorical_palette';
import { KbnColorFnPalette } from './color_fn_palette';
import { elasticPalette } from '../palettes/categorical/elastic';
import { KbnPalette } from '../constants';

const COLORS = ['#000001', '#000002', '#000003', '#000004'];

const createColorFnPalette = (defaultNumberOfColors?: number) => {
  const colorFn = jest.fn((n: number) => Array.from({ length: n }, (_, i) => `#c${n}-${i}`));
  const palette = new KbnColorFnPalette({
    id: KbnPalette.Neutral,
    name: 'Test fn',
    type: 'categorical',
    colorCount: 3,
    defaultNumberOfColors,
    colorFn,
  });
  return { palette, colorFn };
};

describe('KbnCategoricalPalette', () => {
  const palette = new KbnCategoricalPalette({
    id: KbnPalette.Neutral,
    name: 'Test cat',
    colors: COLORS,
  });

  it('returns all colors by default, or the first n', () => {
    expect(palette.colors()).toEqual(COLORS);
    expect(palette.colors(2)).toEqual(COLORS.slice(0, 2));
  });

  it('returns at least one color', () => {
    expect(palette.colors(0)).toEqual(COLORS.slice(0, 1));
  });

  it('getColor returns the color at the index, wrapping around the palette', () => {
    expect(palette.getColor(0)).toBe(COLORS[0]);
    expect(palette.getColor(3)).toBe(COLORS[3]);
    expect(palette.getColor(4)).toBe(COLORS[0]);
    expect(palette.getColor(5, 2)).toBe(COLORS[1]);
  });
});

describe('KbnColorFnPalette', () => {
  it('generates defaultNumberOfColors colors by default', () => {
    const { palette, colorFn } = createColorFnPalette(5);
    expect(palette.colors()).toHaveLength(5);
    expect(colorFn).toHaveBeenLastCalledWith(5);
  });

  it('falls back to colorCount when defaultNumberOfColors is not set', () => {
    const { palette } = createColorFnPalette();
    expect(palette.colors()).toHaveLength(3);
  });

  it('generates the requested number of colors, at least one', () => {
    const { palette, colorFn } = createColorFnPalette(5);
    expect(palette.colors(7)).toHaveLength(7);
    expect(palette.colors(0)).toHaveLength(1);
    expect(colorFn).toHaveBeenLastCalledWith(1);
  });

  it('getColor returns the color at the index, wrapping around the generated colors', () => {
    const { palette } = createColorFnPalette(5);
    expect(palette.getColor(1)).toBe('#c5-1');
    expect(palette.getColor(6)).toBe('#c5-1');
    expect(palette.getColor(3, 2)).toBe('#c2-1');
  });

  it('returns arrays that callers can mutate without affecting later results', () => {
    const { palette } = createColorFnPalette(5);
    palette.colors().reverse();
    expect(palette.colors()[0]).toBe('#c5-0');
    expect(palette.getColor(0)).toBe('#c5-0');
  });
});

describe('elasticPalette', () => {
  const originalVisColors = EUI_VIS_COLOR_STORE.visColors;
  afterEach(() => EUI_VIS_COLOR_STORE.setVisColors(originalVisColors));

  it('returns the EUI color blind palette colors in order, wrapping after the default 30', () => {
    const expected = euiPaletteColorBlind({ rotations: 3 });
    expect(elasticPalette.colors()).toEqual(expected);
    expect(elasticPalette.getColor(0)).toBe(expected[0]);
    expect(elasticPalette.getColor(29)).toBe(expected[29]);
    expect(elasticPalette.getColor(30)).toBe(expected[0]);
  });

  it('follows EUI vis color changes, e.g. on theme switch', () => {
    const before = elasticPalette.getColor(0);
    EUI_VIS_COLOR_STORE.setVisColors({ ...originalVisColors, euiColorVis0: '#123456' });
    const after = elasticPalette.getColor(0);
    expect(after).not.toBe(before);
    expect(after).toBe(euiPaletteColorBlind({ rotations: 3 })[0]);
  });
});

describe('KbnColorFnPalette color reuse', () => {
  const originalVisColors = EUI_VIS_COLOR_STORE.visColors;
  afterEach(() => EUI_VIS_COLOR_STORE.setVisColors(originalVisColors));

  it('does not regenerate colors on subsequent getColor calls', () => {
    const { palette, colorFn } = createColorFnPalette(5);
    for (let i = 0; i < 100; i++) {
      palette.getColor(i);
    }
    expect(colorFn).toHaveBeenCalledTimes(1);
  });

  it('generates colors once per requested number of colors', () => {
    const { palette, colorFn } = createColorFnPalette(5);
    palette.getColor(0, 5);
    palette.getColor(0, 7);
    palette.getColor(1, 5);
    palette.getColor(1, 7);
    expect(colorFn).toHaveBeenCalledTimes(2);
  });

  it('regenerates colors after EUI vis colors change', () => {
    const { palette, colorFn } = createColorFnPalette(5);
    palette.getColor(0);
    EUI_VIS_COLOR_STORE.setVisColors({ ...originalVisColors, euiColorVis0: '#123456' });
    palette.getColor(0);
    palette.getColor(1);
    expect(colorFn).toHaveBeenCalledTimes(2);
  });
});
