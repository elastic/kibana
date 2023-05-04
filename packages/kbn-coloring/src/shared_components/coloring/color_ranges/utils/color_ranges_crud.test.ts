/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  addColorRange,
  deleteColorRange,
  updateColorRangeValue,
  updateColorRangeColor,
} from './color_ranges_crud';
import type { ColorRange } from '../types';

describe('addColorRange', () => {
  let colorRanges: ColorRange[];
  beforeEach(() => {
    colorRanges = [
      { color: '#aaa', start: 20, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 81 },
    ];
  });

  it('should add new color range with the corresponding interva', () => {
    colorRanges[colorRanges.length - 1].end = 80;
    expect(addColorRange(colorRanges, 'number', { min: 0, max: 80 })).toEqual([
      { color: '#aaa', start: 20, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 61 },
      { color: '#ccc', start: 61, end: 80 },
    ]);
  });
});

describe('deleteColorRange', () => {
  let colorRanges: ColorRange[];
  beforeEach(() => {
    colorRanges = [
      { color: '#aaa', start: 20, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 80 },
    ];
  });

  it('delete the last range', () => {
    expect(deleteColorRange(colorRanges.length - 1, colorRanges)).toEqual([
      { color: '#aaa', start: 20, end: 40 },
      { color: '#bbb', start: 40, end: 80 },
    ]);
  });

  it('delete the another range', () => {
    expect(deleteColorRange(1, colorRanges)).toEqual([
      { color: '#aaa', start: 20, end: 60 },
      { color: '#ccc', start: 60, end: 80 },
    ]);
  });
});

describe('updateColorRangeValue', () => {
  let colorRanges: ColorRange[];
  beforeEach(() => {
    colorRanges = [
      { color: '#aaa', start: 20, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 80 },
    ];
  });

  it('update the last end color range value', () => {
    expect(updateColorRangeValue(colorRanges.length - 1, '90', 'end', colorRanges)).toEqual([
      { color: '#aaa', start: 20, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 90 },
    ]);
  });

  it('update the first start color range value', () => {
    expect(updateColorRangeValue(0, '10', 'start', colorRanges)).toEqual([
      { color: '#aaa', start: 10, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 80 },
    ]);
  });

  it('update the color range value between the first and last color ranges', () => {
    expect(updateColorRangeValue(1, '50', 'start', colorRanges)).toEqual([
      { color: '#aaa', start: 20, end: 50 },
      { color: '#bbb', start: 50, end: 60 },
      { color: '#ccc', start: 60, end: 80 },
    ]);
  });
});

describe('updateColorRangeColor', () => {
  let colorRanges: ColorRange[];
  beforeEach(() => {
    colorRanges = [
      { color: '#aaa', start: 20, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 80 },
    ];
  });

  it('update color for color range', () => {
    expect(updateColorRangeColor(0, '#ddd', colorRanges)).toEqual([
      { color: '#ddd', start: 20, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 80 },
    ]);
  });
});
