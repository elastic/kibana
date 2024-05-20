/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  DEFAULT_COLOR_MAPPING_CONFIG,
  DEFAULT_NEUTRAL_PALETTE_INDEX,
} from '../config/default_color_mapping';
import { getColorFactory } from './color_handling';
import { getPalette, AVAILABLE_PALETTES } from '../palettes';
import {
  EUIAmsterdamColorBlindPalette,
  EUI_AMSTERDAM_PALETTE_COLORS,
} from '../palettes/eui_amsterdam';
import { NeutralPalette, NEUTRAL_COLOR_DARK, NEUTRAL_COLOR_LIGHT } from '../palettes/neutral';
import { toHex } from './color_math';

import { ColorMapping } from '../config';

describe('Color mapping - color generation', () => {
  const getPaletteFn = getPalette(AVAILABLE_PALETTES, NeutralPalette);

  it('returns EUI light colors from default config', () => {
    const colorFactory = getColorFactory(DEFAULT_COLOR_MAPPING_CONFIG, getPaletteFn, false, {
      type: 'categories',
      categories: ['catA', 'catB', 'catC'],
    });
    expect(colorFactory('catA')).toBe(EUI_AMSTERDAM_PALETTE_COLORS[0]);
    expect(colorFactory('catB')).toBe(EUI_AMSTERDAM_PALETTE_COLORS[1]);
    expect(colorFactory('catC')).toBe(EUI_AMSTERDAM_PALETTE_COLORS[2]);
    // if the category is not available in the `categories` list then a default netural is used
    // this is an edge case and ideally never happen
    expect(colorFactory('not_available_1')).toBe(
      NEUTRAL_COLOR_LIGHT[DEFAULT_NEUTRAL_PALETTE_INDEX]
    );
  });

  // currently there is no difference in the two colors, but this could change in the future
  // this test will catch the change
  it('returns EUI dark colors from default config', () => {
    const colorFactory = getColorFactory(DEFAULT_COLOR_MAPPING_CONFIG, getPaletteFn, true, {
      type: 'categories',
      categories: ['catA', 'catB', 'catC'],
    });
    expect(colorFactory('catA')).toBe(EUI_AMSTERDAM_PALETTE_COLORS[0]);
    expect(colorFactory('catB')).toBe(EUI_AMSTERDAM_PALETTE_COLORS[1]);
    expect(colorFactory('catC')).toBe(EUI_AMSTERDAM_PALETTE_COLORS[2]);
    // if the category is not available in the `categories` list then a default netural is used
    // this is an edge case and ideally never happen
    expect(colorFactory('not_available')).toBe(NEUTRAL_COLOR_DARK[DEFAULT_NEUTRAL_PALETTE_INDEX]);
  });

  it('by default loops colors defined in palette', () => {
    const twoColorPalette: ColorMapping.CategoricalPalette = {
      id: 'twoColors',
      name: 'twoColors',
      colorCount: 2,
      type: 'categorical',
      getColor(indexInRange, isDarkMode, loop) {
        return ['red', 'blue'][loop ? indexInRange % 2 : indexInRange];
      },
    };

    const simplifiedGetPaletteGn = getPalette(
      new Map([[twoColorPalette.id, twoColorPalette]]),
      NeutralPalette
    );
    const colorFactory = getColorFactory(
      {
        ...DEFAULT_COLOR_MAPPING_CONFIG,
        specialAssignments: [
          {
            color: {
              type: 'loop',
            },
            rule: {
              type: 'other',
            },
            touched: false,
          },
        ],
        paletteId: twoColorPalette.id,
      },
      simplifiedGetPaletteGn,
      false,
      {
        type: 'categories',
        categories: ['cat1', 'cat2', 'cat3', 'cat4'],
      }
    );
    expect(colorFactory('cat1')).toBe('#ff0000');
    expect(colorFactory('cat2')).toBe('#0000ff');
    // the palette will loop depending on the number of colors available
    expect(colorFactory('cat3')).toBe('#ff0000');
    expect(colorFactory('cat4')).toBe('#0000ff');
  });

  it('returns the unassigned color if configured statically', () => {
    const twoColorPalette: ColorMapping.CategoricalPalette = {
      id: 'twoColors',
      name: 'twoColors',
      colorCount: 2,
      type: 'categorical',
      getColor(indexInRange, darkMode, loop) {
        return ['red', 'blue'][loop ? indexInRange % 2 : indexInRange];
      },
    };

    const simplifiedGetPaletteGn = getPalette(
      new Map([[twoColorPalette.id, twoColorPalette]]),
      NeutralPalette
    );
    const colorFactory = getColorFactory(
      {
        ...DEFAULT_COLOR_MAPPING_CONFIG,
        specialAssignments: [
          {
            color: {
              type: 'categorical',
              paletteId: NeutralPalette.id,
              colorIndex: DEFAULT_NEUTRAL_PALETTE_INDEX,
            },
            rule: {
              type: 'other',
            },
            touched: false,
          },
        ],
        paletteId: twoColorPalette.id,
      },
      simplifiedGetPaletteGn,
      false,
      {
        type: 'categories',
        categories: ['cat1', 'cat2', 'cat3', 'cat4'],
      }
    );
    expect(colorFactory('cat1')).toBe(NEUTRAL_COLOR_LIGHT[DEFAULT_NEUTRAL_PALETTE_INDEX]);
    expect(colorFactory('cat2')).toBe(NEUTRAL_COLOR_LIGHT[DEFAULT_NEUTRAL_PALETTE_INDEX]);
    expect(colorFactory('cat3')).toBe(NEUTRAL_COLOR_LIGHT[DEFAULT_NEUTRAL_PALETTE_INDEX]);
    expect(colorFactory('cat4')).toBe(NEUTRAL_COLOR_LIGHT[DEFAULT_NEUTRAL_PALETTE_INDEX]);
    // if the category is not available in the `categories` list then a default netural is used
    // this is an edge case and ideally never happen
    expect(colorFactory('not_available')).toBe(NEUTRAL_COLOR_LIGHT[DEFAULT_NEUTRAL_PALETTE_INDEX]);
  });

  it('handles special tokens, multi-field categories and non-trimmed whitespaces', () => {
    const colorFactory = getColorFactory(DEFAULT_COLOR_MAPPING_CONFIG, getPaletteFn, false, {
      type: 'categories',
      categories: ['__other__', ['fieldA', 'fieldB'], '__empty__', '   with-whitespaces   '],
    });
    expect(colorFactory('__other__')).toBe(EUI_AMSTERDAM_PALETTE_COLORS[0]);
    // expect(colorFactory(['fieldA', 'fieldB'])).toBe(EUI_AMSTERDAM_PALETTE_COLORS[1]);
    expect(colorFactory('__empty__')).toBe(EUI_AMSTERDAM_PALETTE_COLORS[2]);
    expect(colorFactory('   with-whitespaces   ')).toBe(EUI_AMSTERDAM_PALETTE_COLORS[3]);
  });

  it('ignores configured assignments in loop mode', () => {
    const colorFactory = getColorFactory(
      {
        ...DEFAULT_COLOR_MAPPING_CONFIG,
        assignments: [
          {
            color: { type: 'colorCode', colorCode: 'red' },
            rule: { type: 'matchExactly', values: ['configuredAssignment'] },
            touched: false,
          },
        ],
      },
      getPaletteFn,
      false,
      {
        type: 'categories',
        categories: ['catA', 'catB', 'configuredAssignment', 'nextCat'],
      }
    );
    expect(colorFactory('catA')).toBe(EUI_AMSTERDAM_PALETTE_COLORS[0]);
    expect(colorFactory('catB')).toBe(EUI_AMSTERDAM_PALETTE_COLORS[1]);
    expect(colorFactory('configuredAssignment')).toBe('red');
    expect(colorFactory('nextCat')).toBe(EUI_AMSTERDAM_PALETTE_COLORS[2]);
  });

  it('color with auto rule are assigned in order of the configured data input', () => {
    const colorFactory = getColorFactory(
      {
        ...DEFAULT_COLOR_MAPPING_CONFIG,
        assignments: [
          {
            color: { type: 'colorCode', colorCode: 'red' },
            rule: { type: 'auto' },
            touched: false,
          },
          {
            color: { type: 'colorCode', colorCode: 'blue' },
            rule: { type: 'matchExactly', values: ['blueCat'] },
            touched: false,
          },
          {
            color: { type: 'colorCode', colorCode: 'green' },
            rule: { type: 'auto' },
            touched: false,
          },
        ],
      },
      getPaletteFn,
      false,
      {
        type: 'categories',
        categories: ['blueCat', 'redCat', 'greenCat'],
      }
    );
    // this matches exactly
    expect(colorFactory('blueCat')).toBe('blue');
    // this matches with the first availabe "auto" rule
    expect(colorFactory('redCat')).toBe('red');
    // this matches with the second availabe "auto" rule
    expect(colorFactory('greenCat')).toBe('green');
    // if the category is not available in the `categories` list then a default netural is used
    // this is an edge case and ideally never happen
    expect(colorFactory('not_available')).toBe(NEUTRAL_COLOR_LIGHT[DEFAULT_NEUTRAL_PALETTE_INDEX]);
  });

  it('returns sequential gradient colors from darker to lighter [desc, lightMode]', () => {
    const colorFactory = getColorFactory(
      {
        ...DEFAULT_COLOR_MAPPING_CONFIG,
        colorMode: {
          type: 'gradient',
          steps: [
            {
              type: 'categorical',
              paletteId: EUIAmsterdamColorBlindPalette.id,
              colorIndex: 0,
              touched: false,
            },
          ],
          sort: 'desc',
        },
      },
      getPaletteFn,
      false,
      {
        type: 'categories',
        categories: ['cat1', 'cat2', 'cat3'],
      }
    );
    // this matches exactly with the initial step selected
    expect(toHex(colorFactory('cat1'))).toBe(toHex(EUI_AMSTERDAM_PALETTE_COLORS[0]));
    expect(toHex(colorFactory('cat2'))).toBe('#93cebc');
    expect(toHex(colorFactory('cat3'))).toBe('#cce8e0');
  });

  it('sequential gradient colors from lighter to darker [asc, lightMode]', () => {
    const colorFactory = getColorFactory(
      {
        ...DEFAULT_COLOR_MAPPING_CONFIG,
        colorMode: {
          type: 'gradient',
          steps: [
            {
              type: 'categorical',
              paletteId: EUIAmsterdamColorBlindPalette.id,
              colorIndex: 0,
              touched: false,
            },
          ],
          sort: 'asc',
        },
      },
      getPaletteFn,
      false,
      {
        type: 'categories',
        categories: ['cat1', 'cat2', 'cat3'],
      }
    );
    // light green
    expect(toHex(colorFactory('cat1'))).toBe('#cce8e0');
    // mid green point
    expect(toHex(colorFactory('cat2'))).toBe('#93cebc');
    // initial gradient color
    expect(toHex(colorFactory('cat3'))).toBe(EUI_AMSTERDAM_PALETTE_COLORS[0]);
  });
  it('sequential gradients and static color from lighter to darker [asc, lightMode]', () => {
    const colorFactory = getColorFactory(
      {
        ...DEFAULT_COLOR_MAPPING_CONFIG,
        assignments: [
          { color: { type: 'gradient' }, rule: { type: 'auto' }, touched: false },
          { color: { type: 'gradient' }, rule: { type: 'auto' }, touched: false },
        ],

        colorMode: {
          type: 'gradient',
          steps: [
            {
              type: 'categorical',
              paletteId: EUIAmsterdamColorBlindPalette.id,
              colorIndex: 0,
              touched: false,
            },
          ],
          sort: 'asc',
        },
        specialAssignments: [
          {
            color: {
              type: 'categorical',
              colorIndex: DEFAULT_NEUTRAL_PALETTE_INDEX,
              paletteId: NeutralPalette.id,
            },
            rule: {
              type: 'other',
            },
            touched: false,
          },
        ],
      },
      getPaletteFn,
      false,
      {
        type: 'categories',
        categories: ['cat1', 'cat2', 'cat3'],
      }
    );
    expect(toHex(colorFactory('cat1'))).toBe('#cce8e0');
    expect(toHex(colorFactory('cat2'))).toBe(EUI_AMSTERDAM_PALETTE_COLORS[0]);
    // this matches exactly with the initial step selected
    expect(toHex(colorFactory('cat3'))).toBe(NEUTRAL_COLOR_LIGHT[DEFAULT_NEUTRAL_PALETTE_INDEX]);
  });

  it('returns 2 colors gradient [desc, lightMode]', () => {
    const colorFactory = getColorFactory(
      {
        ...DEFAULT_COLOR_MAPPING_CONFIG,
        colorMode: {
          type: 'gradient',
          steps: [
            {
              type: 'categorical',
              paletteId: EUIAmsterdamColorBlindPalette.id,
              colorIndex: 0,
              touched: false,
            },
            {
              type: 'categorical',
              paletteId: EUIAmsterdamColorBlindPalette.id,
              colorIndex: 2,
              touched: false,
            },
          ],
          sort: 'desc',
        },
      },
      getPaletteFn,
      false,
      {
        type: 'categories',
        categories: ['cat1', 'cat2', 'cat3'],
      }
    );
    expect(toHex(colorFactory('cat1'))).toBe(toHex(EUI_AMSTERDAM_PALETTE_COLORS[0])); // EUI green
    expect(toHex(colorFactory('cat2'))).toBe('#a4908f'); // red gray green
    expect(toHex(colorFactory('cat3'))).toBe(toHex(EUI_AMSTERDAM_PALETTE_COLORS[2])); // EUI pink
  });

  it('returns divergent gradient [asc, darkMode]', () => {
    const colorFactory = getColorFactory(
      {
        ...DEFAULT_COLOR_MAPPING_CONFIG,
        colorMode: {
          type: 'gradient',
          steps: [
            {
              type: 'categorical',
              paletteId: EUIAmsterdamColorBlindPalette.id,
              colorIndex: 0,
              touched: false,
            },
            { type: 'categorical', paletteId: NeutralPalette.id, colorIndex: 0, touched: false },
            {
              type: 'categorical',
              paletteId: EUIAmsterdamColorBlindPalette.id,
              colorIndex: 2,
              touched: false,
            },
          ],
          sort: 'asc', // testing in ascending order
        },
      },
      getPaletteFn,
      true, // testing in dark mode
      {
        type: 'categories',
        categories: ['cat1', 'cat2', 'cat3'],
      }
    );
    expect(toHex(colorFactory('cat1'))).toBe(toHex(EUI_AMSTERDAM_PALETTE_COLORS[2])); // EUI pink
    expect(toHex(colorFactory('cat2'))).toBe(NEUTRAL_COLOR_DARK[0]); // NEUTRAL LIGHT GRAY
    expect(toHex(colorFactory('cat3'))).toBe(toHex(EUI_AMSTERDAM_PALETTE_COLORS[0])); // EUI green
    // if the category is not available in the `categories` list then a default netural is used
    // this is an edge case and ideally never happen
    expect(colorFactory('not_available')).toBe(NEUTRAL_COLOR_DARK[DEFAULT_NEUTRAL_PALETTE_INDEX]);
  });
});
