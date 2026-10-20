/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { splitSeriesAtNullGaps } from './utils';
import type { SparklinePoint } from './utils';

const p = (x: number, y: number | null): SparklinePoint => ({ x, y });

describe('splitSeriesAtNullGaps', () => {
  it('returns empty results for an empty array', () => {
    expect(splitSeriesAtNullGaps([])).toEqual({
      mainSegments: [],
      leadingEdge: null,
      trailingEdge: null,
      interiorEdges: [],
    });
  });

  it('returns the data as a single segment when all y values are null', () => {
    const data = [p(0, null), p(1, null), p(2, null)];
    expect(splitSeriesAtNullGaps(data)).toEqual({
      mainSegments: [data],
      leadingEdge: null,
      trailingEdge: null,
      interiorEdges: [],
    });
  });

  it('returns a single main segment with no edges when there are no nulls', () => {
    const data = [p(0, 1), p(1, 2), p(2, 3)];
    expect(splitSeriesAtNullGaps(data)).toEqual({
      mainSegments: [data],
      leadingEdge: null,
      trailingEdge: null,
      interiorEdges: [],
    });
  });

  it('produces a leading edge for leading nulls', () => {
    const data = [p(0, null), p(1, null), p(2, 5), p(3, 6)];
    expect(splitSeriesAtNullGaps(data)).toEqual({
      mainSegments: [[p(2, 5), p(3, 6)]],
      leadingEdge: [p(0, 5), p(2, 5)],
      trailingEdge: null,
      interiorEdges: [],
    });
  });

  it('produces a trailing edge for trailing nulls', () => {
    const data = [p(0, 5), p(1, 6), p(2, null), p(3, null)];
    expect(splitSeriesAtNullGaps(data)).toEqual({
      mainSegments: [[p(0, 5), p(1, 6)]],
      leadingEdge: null,
      trailingEdge: [p(1, 6), p(3, 6)],
      interiorEdges: [],
    });
  });

  it('produces both edges when nulls appear at leading and trailing positions', () => {
    const data = [p(0, null), p(1, 5), p(2, 6), p(3, null)];
    expect(splitSeriesAtNullGaps(data)).toEqual({
      mainSegments: [[p(1, 5), p(2, 6)]],
      leadingEdge: [p(0, 5), p(1, 5)],
      trailingEdge: [p(2, 6), p(3, 6)],
      interiorEdges: [],
    });
  });

  it('splits into two segments and produces one interior edge for a single interior gap', () => {
    const data = [p(0, 1), p(1, 2), p(2, null), p(3, 4), p(4, 5)];
    expect(splitSeriesAtNullGaps(data)).toEqual({
      mainSegments: [
        [p(0, 1), p(1, 2)],
        [p(3, 4), p(4, 5)],
      ],
      leadingEdge: null,
      trailingEdge: null,
      interiorEdges: [[p(1, 2), p(3, 4)]],
    });
  });

  it('treats y:0 as a valid value, not a null gap', () => {
    const data = [p(0, null), p(1, 5), p(2, 3), p(3, 0), p(4, 0)];
    expect(splitSeriesAtNullGaps(data)).toEqual({
      mainSegments: [[p(1, 5), p(2, 3), p(3, 0), p(4, 0)]],
      leadingEdge: [p(0, 5), p(1, 5)],
      trailingEdge: null,
      interiorEdges: [],
    });
  });

  it('splits into three segments and produces two interior edges for multiple gaps', () => {
    const data = [p(0, 1), p(1, null), p(2, 3), p(3, null), p(4, 5)];
    expect(splitSeriesAtNullGaps(data)).toEqual({
      mainSegments: [[p(0, 1)], [p(2, 3)], [p(4, 5)]],
      leadingEdge: null,
      trailingEdge: null,
      interiorEdges: [
        [p(0, 1), p(2, 3)],
        [p(2, 3), p(4, 5)],
      ],
    });
  });
});
