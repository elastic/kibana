/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getPaletteRegistry } from './mocks/palettes_registry';
import {
  getDataMinMax,
  getPaletteStops,
  getStepValue,
  remapStopsByNewInterval,
  reversePalette,
} from './utils';

describe('remapStopsByNewInterval', () => {
  it('should correctly remap the current palette from 0..1 to 0...100', () => {
    expect(
      remapStopsByNewInterval(
        [
          { color: 'black', stop: 0 },
          { color: 'green', stop: 0.5 },
          { color: 'red', stop: 0.9 },
        ],
        { newInterval: 100, oldInterval: 1, newMin: 0, oldMin: 0 }
      )
    ).toEqual([
      { color: 'black', stop: 0 },
      { color: 'green', stop: 50 },
      { color: 'red', stop: 90 },
    ]);

    // now test the other way around
    expect(
      remapStopsByNewInterval(
        [
          { color: 'black', stop: 0 },
          { color: 'green', stop: 50 },
          { color: 'red', stop: 90 },
        ],
        { newInterval: 1, oldInterval: 100, newMin: 0, oldMin: 0 }
      )
    ).toEqual([
      { color: 'black', stop: 0 },
      { color: 'green', stop: 0.5 },
      { color: 'red', stop: 0.9 },
    ]);
  });

  it('should correctly handle negative numbers to/from', () => {
    expect(
      remapStopsByNewInterval(
        [
          { color: 'black', stop: -100 },
          { color: 'green', stop: -50 },
          { color: 'red', stop: -1 },
        ],
        { newInterval: 100, oldInterval: 100, newMin: 0, oldMin: -100 }
      )
    ).toEqual([
      { color: 'black', stop: 0 },
      { color: 'green', stop: 50 },
      { color: 'red', stop: 99 },
    ]);

    // now map the other way around
    expect(
      remapStopsByNewInterval(
        [
          { color: 'black', stop: 0 },
          { color: 'green', stop: 50 },
          { color: 'red', stop: 99 },
        ],
        { newInterval: 100, oldInterval: 100, newMin: -100, oldMin: 0 }
      )
    ).toEqual([
      { color: 'black', stop: -100 },
      { color: 'green', stop: -50 },
      { color: 'red', stop: -1 },
    ]);

    // and test also palettes that also contains negative values
    expect(
      remapStopsByNewInterval(
        [
          { color: 'black', stop: -50 },
          { color: 'green', stop: 0 },
          { color: 'red', stop: 50 },
        ],
        { newInterval: 100, oldInterval: 100, newMin: 0, oldMin: -50 }
      )
    ).toEqual([
      { color: 'black', stop: 0 },
      { color: 'green', stop: 50 },
      { color: 'red', stop: 100 },
    ]);
  });
});

describe('getDataMinMax', () => {
  it('should pick the correct min/max based on the current range type', () => {
    expect(getDataMinMax('percent', { min: -100, max: 0 })).toEqual({ min: 0, max: 100 });
  });

  it('should pick the correct min/max apply percent by default', () => {
    expect(getDataMinMax(undefined, { min: -100, max: 0 })).toEqual({ min: 0, max: 100 });
  });
});

describe('getPaletteStops', () => {
  const paletteRegistry = getPaletteRegistry();
  it('should correctly compute a predefined palette stops definition from only the name', () => {
    expect(
      getPaletteStops(paletteRegistry, { name: 'mock' }, { dataBounds: { min: 0, max: 100 } })
    ).toEqual([
      { color: 'blue', stop: 20 },
      { color: 'yellow', stop: 70 },
    ]);
  });

  it('should correctly compute a predefined palette stops definition from explicit prevPalette (override)', () => {
    expect(
      getPaletteStops(
        paletteRegistry,
        { name: 'default' },
        { dataBounds: { min: 0, max: 100 }, prevPalette: 'mock' }
      )
    ).toEqual([
      { color: 'blue', stop: 20 },
      { color: 'yellow', stop: 70 },
    ]);
  });

  it('should infer the domain from dataBounds but start from 0', () => {
    expect(
      getPaletteStops(
        paletteRegistry,
        { name: 'default', rangeType: 'number' },
        { dataBounds: { min: 1, max: 11 }, prevPalette: 'mock' }
      )
    ).toEqual([
      { color: 'blue', stop: 2 },
      { color: 'yellow', stop: 7 },
    ]);
  });

  it('should override the minStop when requested', () => {
    expect(
      getPaletteStops(
        paletteRegistry,
        { name: 'default', rangeType: 'number' },
        { dataBounds: { min: 1, max: 11 }, mapFromMinValue: true }
      )
    ).toEqual([
      { color: 'red', stop: 1 },
      { color: 'black', stop: 6 },
    ]);
  });

  it('should compute a display stop palette from custom colorStops defined by the user', () => {
    expect(
      getPaletteStops(
        paletteRegistry,
        {
          name: 'custom',
          rangeType: 'number',
          colorStops: [
            { color: 'green', stop: 0 },
            { color: 'blue', stop: 40 },
            { color: 'red', stop: 80 },
          ],
        },
        { dataBounds: { min: 0, max: 100 } }
      )
    ).toEqual([
      { color: 'green', stop: 40 },
      { color: 'blue', stop: 80 },
      { color: 'red', stop: 100 },
    ]);
  });

  it('should compute a display stop palette from custom colorStops defined by the user - handle stop at the end', () => {
    expect(
      getPaletteStops(
        paletteRegistry,
        {
          name: 'custom',
          rangeType: 'number',
          colorStops: [
            { color: 'green', stop: 0 },
            { color: 'blue', stop: 40 },
            { color: 'red', stop: 100 },
          ],
        },
        { dataBounds: { min: 0, max: 100 } }
      )
    ).toEqual([
      { color: 'green', stop: 40 },
      { color: 'blue', stop: 100 },
      { color: 'red', stop: 101 },
    ]);
  });

  it('should compute a display stop palette from custom colorStops defined by the user - handle stop at the end (fractional)', () => {
    expect(
      getPaletteStops(
        paletteRegistry,
        {
          name: 'custom',
          rangeType: 'number',
          colorStops: [
            { color: 'green', stop: 0 },
            { color: 'blue', stop: 0.4 },
            { color: 'red', stop: 1 },
          ],
        },
        { dataBounds: { min: 0, max: 1 } }
      )
    ).toEqual([
      { color: 'green', stop: 0.4 },
      { color: 'blue', stop: 1 },
      { color: 'red', stop: 2 },
    ]);
  });

  it('should compute a display stop palette from custom colorStops defined by the user - stretch the stops to 100% percent', () => {
    expect(
      getPaletteStops(
        paletteRegistry,
        {
          name: 'custom',
          colorStops: [
            { color: 'green', stop: 0 },
            { color: 'blue', stop: 0.4 },
            { color: 'red', stop: 1 },
          ],
        },
        { dataBounds: { min: 0, max: 1 } }
      )
    ).toEqual([
      { color: 'green', stop: 0.4 },
      { color: 'blue', stop: 1 },
      { color: 'red', stop: 100 }, // default rangeType is percent, hence stretch to 100%
    ]);
  });
});

describe('reversePalette', () => {
  it('should correctly reverse color and stops', () => {
    expect(
      reversePalette([
        { color: 'red', stop: 0 },
        { color: 'green', stop: 0.5 },
        { color: 'blue', stop: 0.9 },
      ])
    ).toEqual([
      { color: 'blue', stop: 0 },
      { color: 'green', stop: 0.5 },
      { color: 'red', stop: 0.9 },
    ]);
  });
});

describe('getStepValue', () => {
  it('should compute the next step based on the last 2 stops', () => {
    expect(
      getStepValue(
        // first arg is taken as max reference
        [
          { color: 'red', stop: 0 },
          { color: 'red', stop: 50 },
        ],
        [
          { color: 'red', stop: 0 },
          { color: 'red', stop: 50 },
        ],
        100
      )
    ).toBe(50);

    expect(
      getStepValue(
        // first arg is taken as max reference
        [
          { color: 'red', stop: 0 },
          { color: 'red', stop: 80 },
        ],
        [
          { color: 'red', stop: 0 },
          { color: 'red', stop: 50 },
        ],
        90
      )
    ).toBe(10); // 90 - 80

    expect(
      getStepValue(
        // first arg is taken as max reference
        [
          { color: 'red', stop: 0 },
          { color: 'red', stop: 100 },
        ],
        [
          { color: 'red', stop: 0 },
          { color: 'red', stop: 50 },
        ],
        100
      )
    ).toBe(1);
  });
});
