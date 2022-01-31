/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { workoutColorForValue } from './helpers';
import { CustomPaletteState } from '../..';

describe('workoutColorForValue', () => {
  it('should return no color for empty value', () => {
    expect(
      workoutColorForValue(
        undefined,
        {
          continuity: 'above',
          colors: ['red', 'green', 'blue', 'yellow'],
          range: 'number',
          gradient: false,
          rangeMin: 0,
          rangeMax: 200,
          stops: [],
        },
        { min: 0, max: 200 }
      )
    ).toBeUndefined();
  });

  describe('range: "number"', () => {
    const DEFAULT_PROPS: CustomPaletteState = {
      continuity: 'above',
      colors: ['red', 'green', 'blue', 'yellow'],
      range: 'number',
      gradient: false,
      rangeMin: 0,
      rangeMax: 200,
      stops: [],
    };
    it('find the right color for predefined palettes', () => {
      expect(workoutColorForValue(123, DEFAULT_PROPS, { min: 0, max: 200 })).toBe('blue');
    });

    it('find the right color for custom stops palettes', () => {
      expect(
        workoutColorForValue(
          50,
          {
            ...DEFAULT_PROPS,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('blue');
    });

    it('find the right color for custom stops palettes when value is higher than rangeMax', () => {
      expect(
        workoutColorForValue(
          123,
          {
            ...DEFAULT_PROPS,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('yellow');
      expect(
        workoutColorForValue(
          123,
          {
            ...DEFAULT_PROPS,
            continuity: 'all',
            rangeMax: Infinity,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('yellow');
    });

    it('returns no color if the value if higher than rangeMax and continuity is nor "above" or "all"', () => {
      expect(
        workoutColorForValue(
          123,
          {
            ...DEFAULT_PROPS,
            continuity: 'below',
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
      expect(
        workoutColorForValue(
          123,
          {
            ...DEFAULT_PROPS,
            continuity: 'none',
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
    });

    it('find the right color for custom stops palettes when value is lower than rangeMin', () => {
      expect(
        workoutColorForValue(
          10,
          {
            ...DEFAULT_PROPS,
            continuity: 'below',
            rangeMin: 20,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('red');
      expect(
        workoutColorForValue(
          10,
          {
            ...DEFAULT_PROPS,
            continuity: 'all',
            rangeMin: 20,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('red');
    });

    it('returns no color if the value if lower than rangeMin and continuity is nor "below" or "all"', () => {
      expect(
        workoutColorForValue(
          0,
          {
            ...DEFAULT_PROPS,
            rangeMin: 10,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
      expect(
        workoutColorForValue(
          0,
          {
            ...DEFAULT_PROPS,
            continuity: 'none',
            rangeMin: 10,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
    });
  });

  describe('range: "percent"', () => {
    const DEFAULT_PROPS: CustomPaletteState = {
      continuity: 'above',
      colors: ['red', 'green', 'blue', 'yellow'],
      range: 'percent',
      gradient: false,
      rangeMin: 0,
      rangeMax: 100,
      stops: [],
    };
    it('find the right color for predefined palettes', () => {
      expect(workoutColorForValue(123, DEFAULT_PROPS, { min: 0, max: 200 })).toBe('blue');
    });

    it('find the right color for custom stops palettes', () => {
      expect(
        workoutColorForValue(
          113,
          {
            ...DEFAULT_PROPS,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('blue'); // 113/200 ~ 56%
    });

    it('find the right color for custom stops palettes when value is higher than rangeMax', () => {
      expect(
        workoutColorForValue(
          123,
          {
            ...DEFAULT_PROPS,
            rangeMax: 90,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('yellow');
      expect(
        workoutColorForValue(
          123,
          {
            ...DEFAULT_PROPS,
            continuity: 'all',
            rangeMax: 90,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('yellow');
    });

    it('returns no color if the value if higher than rangeMax and continuity is nor "above" or "all"', () => {
      expect(
        workoutColorForValue(
          190,
          {
            ...DEFAULT_PROPS,
            continuity: 'below',
            rangeMax: 90,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
      expect(
        workoutColorForValue(
          190,
          {
            ...DEFAULT_PROPS,
            continuity: 'none',
            rangeMax: 90,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
    });

    it('find the right color for custom stops palettes when value is lower than rangeMin', () => {
      expect(
        workoutColorForValue(
          10,
          {
            ...DEFAULT_PROPS,
            continuity: 'below',
            rangeMin: 20,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('red');
      expect(
        workoutColorForValue(
          10,
          {
            ...DEFAULT_PROPS,
            continuity: 'all',
            rangeMin: 20,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('red');
    });

    it('returns no color if the value if lower than rangeMin and continuity is nor "below" or "all"', () => {
      expect(
        workoutColorForValue(
          0,
          {
            ...DEFAULT_PROPS,
            continuity: 'above',
            rangeMin: 10,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
      expect(
        workoutColorForValue(
          0,
          {
            ...DEFAULT_PROPS,
            continuity: 'none',
            rangeMin: 10,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
    });
  });
});
