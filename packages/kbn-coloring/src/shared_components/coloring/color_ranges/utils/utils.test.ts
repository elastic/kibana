/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sortColorRanges, calculateMaxStep, toColorStops, getValueForContinuity } from './utils';

describe('utils', () => {
  it('sortColorRanges', () => {
    let colorRanges = [
      { color: '#aaa', start: 55, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 80 },
    ];
    expect(sortColorRanges(colorRanges)).toEqual([
      { color: '#bbb', start: 40, end: 55 },
      { color: '#aaa', start: 55, end: 60 },
      { color: '#ccc', start: 60, end: 80 },
    ]);

    colorRanges = [
      { color: '#aaa', start: 55, end: 90 },
      { color: '#bbb', start: 90, end: 60 },
      { color: '#ccc', start: 60, end: 80 },
    ];
    expect(sortColorRanges(colorRanges)).toEqual([
      { color: '#aaa', start: 55, end: 60 },
      { color: '#ccc', start: 60, end: 80 },
      { color: '#bbb', start: 80, end: 90 },
    ]);

    colorRanges = [
      { color: '#aaa', start: 55, end: 90 },
      { color: '#bbb', start: 90, end: 60 },
      { color: '#ccc', start: 60, end: Infinity },
    ];
    expect(sortColorRanges(colorRanges)).toEqual([
      { color: '#aaa', start: 55, end: 60 },
      { color: '#ccc', start: 60, end: 90 },
      { color: '#bbb', start: 90, end: Infinity },
    ]);

    colorRanges = [{ color: '#aaa', start: 90, end: 55 }];
    expect(sortColorRanges(colorRanges)).toEqual([{ color: '#aaa', start: 55, end: 90 }]);
  });

  it('calculateMaxStep', () => {
    const stops = [20, 40, 60];
    expect(calculateMaxStep(stops, 90)).toEqual(20);
    // should return 1 if the last stop with calculated interval more than max
    expect(calculateMaxStep(stops, 75)).toEqual(1);
    // should return 1 if we don't provide stops
    expect(calculateMaxStep([], 75)).toEqual(1);
  });

  it('toColorStops', () => {
    const colorRanges = [
      { color: '#aaa', start: 20, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 80 },
    ];
    const colorStops = [
      {
        color: '#aaa',
        stop: 20,
      },
      {
        color: '#bbb',
        stop: 40,
      },
      {
        color: '#ccc',
        stop: 60,
      },
    ];

    // if continuity is none then min should be the first range value
    // and max should be the last range value
    expect(toColorStops(colorRanges, 'none')).toEqual({
      min: 20,
      max: 80,
      colorStops,
    });

    colorStops[0].stop = Number.NEGATIVE_INFINITY;
    // if continuity is below then min should be -Infinity
    expect(toColorStops(colorRanges, 'below')).toEqual({
      min: Number.NEGATIVE_INFINITY,
      max: 80,
      colorStops,
    });

    colorStops[0].stop = 20;
    // if continuity is above then max should be Infinity
    expect(toColorStops(colorRanges, 'above')).toEqual({
      min: 20,
      max: Number.POSITIVE_INFINITY,
      colorStops,
    });

    colorStops[0].stop = Number.NEGATIVE_INFINITY;
    // if continuity is all then max should be Infinity and min should be -Infinity
    expect(toColorStops(colorRanges, 'all')).toEqual({
      min: Number.NEGATIVE_INFINITY,
      max: Number.POSITIVE_INFINITY,
      colorStops,
    });
  });

  describe('getValueForContinuity', () => {
    it('should return Infinity if continuity is all or above and that last range', () => {
      const colorRanges = [
        { color: '#aaa', start: 20, end: 40 },
        { color: '#bbb', start: 40, end: 60 },
        { color: '#ccc', start: 60, end: 80 },
      ];
      expect(
        getValueForContinuity(colorRanges, 'above', true, 'number', { min: 0, max: 100 })
      ).toEqual(Number.POSITIVE_INFINITY);

      expect(
        getValueForContinuity(colorRanges, 'all', true, 'number', { min: 0, max: 100 })
      ).toEqual(Number.POSITIVE_INFINITY);
    });

    it('should return -Infinity if continuity is all or below and that first range', () => {
      const colorRanges = [
        { color: '#aaa', start: 20, end: 40 },
        { color: '#bbb', start: 40, end: 60 },
        { color: '#ccc', start: 60, end: 80 },
      ];
      expect(
        getValueForContinuity(colorRanges, 'below', false, 'number', { min: 0, max: 100 })
      ).toEqual(Number.NEGATIVE_INFINITY);

      expect(
        getValueForContinuity(colorRanges, 'all', false, 'number', { min: 0, max: 100 })
      ).toEqual(Number.NEGATIVE_INFINITY);
    });

    it('should return new max if continuity is none or below and that last range', () => {
      const colorRanges = [
        { color: '#aaa', start: 20, end: 40 },
        { color: '#bbb', start: 40, end: 60 },
        { color: '#ccc', start: 60, end: 80 },
      ];
      expect(
        getValueForContinuity(colorRanges, 'below', true, 'number', { min: 0, max: 100 })
      ).toEqual(100);

      expect(
        getValueForContinuity(colorRanges, 'none', true, 'number', { min: 0, max: 55 })
      ).toEqual(61);
    });

    it('should return new min if continuity is none or above and that first range', () => {
      const colorRanges = [
        { color: '#aaa', start: 20, end: 40 },
        { color: '#bbb', start: 40, end: 60 },
        { color: '#ccc', start: 60, end: 80 },
      ];
      expect(
        getValueForContinuity(colorRanges, 'above', false, 'number', { min: 0, max: 100 })
      ).toEqual(0);

      expect(
        getValueForContinuity(colorRanges, 'none', false, 'number', { min: 45, max: 100 })
      ).toEqual(39);
    });
  });
});
