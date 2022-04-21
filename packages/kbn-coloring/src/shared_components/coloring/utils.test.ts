/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getColorStops,
  isValidColor,
  mergePaletteParams,
  updateRangeType,
  changeColorPalette,
} from './utils';

import { getPaletteRegistry } from './mocks/palettes_registry';

describe('getColorStops', () => {
  const paletteRegistry = getPaletteRegistry();
  it('should return the same colorStops if a custom palette is passed, avoiding recomputation', () => {
    const colorStops = [
      { stop: 0, color: 'red' },
      { stop: 100, color: 'blue' },
    ];
    expect(
      getColorStops(
        paletteRegistry,
        colorStops,
        { name: 'custom', type: 'palette' },
        { min: 0, max: 100 }
      )
    ).toBe(colorStops);
  });

  it('should get a fresh list of colors', () => {
    expect(
      getColorStops(
        paletteRegistry,
        [
          { stop: 0, color: 'red' },
          { stop: 100, color: 'blue' },
        ],
        { name: 'mocked', type: 'palette' },
        { min: 0, max: 100 }
      )
    ).toEqual([
      { color: 'blue', stop: 0 },
      { color: 'yellow', stop: 50 },
    ]);
  });

  it('should get a fresh list of colors even if custom palette but empty colorStops', () => {
    expect(
      getColorStops(paletteRegistry, [], { name: 'mocked', type: 'palette' }, { min: 0, max: 100 })
    ).toEqual([
      { color: 'blue', stop: 0 },
      { color: 'yellow', stop: 50 },
    ]);
  });

  it('should correctly map the new colorStop to the current data bound and minValue', () => {
    expect(
      getColorStops(
        paletteRegistry,
        [],
        { name: 'mocked', type: 'palette', params: { rangeType: 'number' } },
        { min: 100, max: 1000 }
      )
    ).toEqual([
      { color: 'blue', stop: 100 },
      { color: 'yellow', stop: 550 },
    ]);
  });

  it('should reverse the colors', () => {
    expect(
      getColorStops(
        paletteRegistry,
        [],
        { name: 'mocked', type: 'palette', params: { reverse: true } },
        { min: 100, max: 1000 }
      )
    ).toEqual([
      { color: 'yellow', stop: 0 },
      { color: 'blue', stop: 50 },
    ]);
  });
});

describe('mergePaletteParams', () => {
  it('should return a full palette', () => {
    expect(mergePaletteParams({ type: 'palette', name: 'myPalette' }, { reverse: true })).toEqual({
      type: 'palette',
      name: 'myPalette',
      params: { reverse: true },
    });
  });
});

describe('isValidColor', () => {
  it('should return ok for valid hex color notation', () => {
    expect(isValidColor('#fff')).toBe(true);
    expect(isValidColor('#ffffff')).toBe(true);
    expect(isValidColor('#ffffffaa')).toBe(true);
  });

  it('should return false for non valid strings', () => {
    expect(isValidColor('')).toBe(false);
    expect(isValidColor('#')).toBe(false);
    expect(isValidColor('#ff')).toBe(false);
    expect(isValidColor('123')).toBe(false);
    expect(isValidColor('rgb(1, 1, 1)')).toBe(false);
    expect(isValidColor('rgba(1, 1, 1, 0)')).toBe(false);
    expect(isValidColor('#ffffffgg')).toBe(false);
    expect(isValidColor('#fff00')).toBe(false);
    // this version of chroma does not support hex4 format
    expect(isValidColor('#fffa')).toBe(false);
  });
});

describe('updateRangeType', () => {
  const paletteRegistry = getPaletteRegistry();
  const colorRanges = [
    {
      start: 0,
      end: 40,
      color: 'green',
    },
    {
      start: 40,
      end: 80,
      color: 'blue',
    },
    {
      start: 80,
      end: 100,
      color: 'red',
    },
  ];
  it('should correctly update palette params with new range type if continuity is none', () => {
    const newPaletteParams = updateRangeType(
      'number',
      {
        type: 'palette',
        name: 'custom',
        params: {
          continuity: 'none',
          name: 'custom',
          rangeType: 'percent',
          rangeMax: 100,
          rangeMin: 0,
          colorStops: [
            { color: 'green', stop: 0 },
            { color: 'blue', stop: 40 },
            { color: 'red', stop: 80 },
          ],
        },
      },
      { min: 0, max: 200 },
      paletteRegistry,
      colorRanges
    );
    expect(newPaletteParams).toEqual({
      rangeType: 'number',
      rangeMin: 0,
      rangeMax: 200,
      colorStops: [
        {
          color: 'green',
          stop: 0,
        },
        {
          color: 'blue',
          stop: 80,
        },
        {
          color: 'red',
          stop: 160,
        },
      ],
      stops: [
        {
          color: 'green',
          stop: 80,
        },
        {
          color: 'blue',
          stop: 160,
        },
        {
          color: 'red',
          stop: 200,
        },
      ],
    });
  });

  it('should correctly update palette params with new range type if continuity is all', () => {
    const newPaletteParams = updateRangeType(
      'number',
      {
        type: 'palette',
        name: 'custom',
        params: {
          continuity: 'all',
          name: 'custom',
          rangeType: 'percent',
          rangeMax: 100,
          rangeMin: 0,
          colorStops: [
            { color: 'green', stop: 0 },
            { color: 'blue', stop: 40 },
            { color: 'red', stop: 80 },
          ],
        },
      },
      { min: 0, max: 200 },
      paletteRegistry,
      colorRanges
    );
    expect(newPaletteParams).toEqual({
      rangeType: 'number',
      rangeMin: Number.NEGATIVE_INFINITY,
      rangeMax: Number.POSITIVE_INFINITY,
      colorStops: [
        {
          color: 'green',
          stop: 0,
        },
        {
          color: 'blue',
          stop: 80,
        },
        {
          color: 'red',
          stop: 160,
        },
      ],
      stops: [
        {
          color: 'green',
          stop: 80,
        },
        {
          color: 'blue',
          stop: 160,
        },
        {
          color: 'red',
          stop: 200,
        },
      ],
    });
  });

  it('should correctly update palette params with new range type if continuity is below', () => {
    const newPaletteParams = updateRangeType(
      'number',
      {
        type: 'palette',
        name: 'custom',
        params: {
          continuity: 'below',
          name: 'custom',
          rangeType: 'percent',
          rangeMax: 100,
          rangeMin: 0,
          colorStops: [
            { color: 'green', stop: 0 },
            { color: 'blue', stop: 40 },
            { color: 'red', stop: 80 },
          ],
        },
      },
      { min: 0, max: 200 },
      paletteRegistry,
      colorRanges
    );
    expect(newPaletteParams).toEqual({
      rangeType: 'number',
      rangeMin: Number.NEGATIVE_INFINITY,
      rangeMax: 200,
      colorStops: [
        {
          color: 'green',
          stop: 0,
        },
        {
          color: 'blue',
          stop: 80,
        },
        {
          color: 'red',
          stop: 160,
        },
      ],
      stops: [
        {
          color: 'green',
          stop: 80,
        },
        {
          color: 'blue',
          stop: 160,
        },
        {
          color: 'red',
          stop: 200,
        },
      ],
    });
  });

  it('should correctly update palette params with new range type if continuity is above', () => {
    const newPaletteParams = updateRangeType(
      'number',
      {
        type: 'palette',
        name: 'custom',
        params: {
          continuity: 'above',
          name: 'custom',
          rangeType: 'percent',
          rangeMax: 100,
          rangeMin: 0,
          colorStops: [
            { color: 'green', stop: 0 },
            { color: 'blue', stop: 40 },
            { color: 'red', stop: 80 },
          ],
        },
      },
      { min: 0, max: 200 },
      paletteRegistry,
      colorRanges
    );
    expect(newPaletteParams).toEqual({
      rangeType: 'number',
      rangeMin: 0,
      rangeMax: Number.POSITIVE_INFINITY,
      colorStops: [
        {
          color: 'green',
          stop: 0,
        },
        {
          color: 'blue',
          stop: 80,
        },
        {
          color: 'red',
          stop: 160,
        },
      ],
      stops: [
        {
          color: 'green',
          stop: 80,
        },
        {
          color: 'blue',
          stop: 160,
        },
        {
          color: 'red',
          stop: 200,
        },
      ],
    });
  });
});

describe('changeColorPalette', () => {
  const paletteRegistry = getPaletteRegistry();

  it('should correct update params for new palette', () => {
    const newPaletteParams = changeColorPalette(
      {
        type: 'palette',
        name: 'default',
      },
      {
        type: 'palette',
        name: 'custom',
        params: {
          continuity: 'above',
          name: 'custom',
          rangeType: 'percent',
          rangeMax: 100,
          rangeMin: 0,
          colorStops: [
            { color: 'green', stop: 0 },
            { color: 'blue', stop: 40 },
            { color: 'red', stop: 80 },
          ],
        },
      },
      paletteRegistry,
      { min: 0, max: 200 },
      false
    );
    expect(newPaletteParams).toEqual({
      name: 'default',
      type: 'palette',
      params: {
        rangeType: 'percent',
        name: 'default',
        continuity: 'above',
        rangeMin: 0,
        rangeMax: Number.POSITIVE_INFINITY,
        reverse: false,
        colorStops: undefined,
        stops: [
          {
            color: 'red',
            stop: 0,
          },
          {
            color: 'black',
            stop: 50,
          },
        ],
      },
    });
  });
});
