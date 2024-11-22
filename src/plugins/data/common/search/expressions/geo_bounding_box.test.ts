/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { functionWrapper } from './utils';
import { geoBoundingBoxFunction } from './geo_bounding_box';

describe('interpreter/functions#geoBoundingBox', () => {
  const fn = functionWrapper(geoBoundingBoxFunction);

  it('should return a geo bounding box structure', () => {
    expect(fn(null, { wkt: 'something' })).toHaveProperty('type', 'geo_bounding_box');
  });

  it('should construct a bounding box from a well-known text', () => {
    expect(fn(null, { wkt: 'something' })).toEqual(
      expect.objectContaining({
        wkt: 'something',
      })
    );
  });

  it('should construct a bounding box from four coordinates', () => {
    expect(fn(null, { top: 1, left: 2, bottom: 3, right: 4 })).toEqual(
      expect.objectContaining({
        top: 1,
        left: 2,
        bottom: 3,
        right: 4,
      })
    );
  });

  it('should construct a bounding box from two points', () => {
    expect(
      fn(null, {
        topLeft: { type: 'geo_point', value: '1, 2' },
        bottomRight: { type: 'geo_point', value: '3, 4' },
      })
    ).toEqual(
      expect.objectContaining({
        top_left: '1, 2',
        bottom_right: '3, 4',
      })
    );

    expect(
      fn(null, {
        topRight: { type: 'geo_point', value: '1, 2' },
        bottomLeft: { type: 'geo_point', value: '3, 4' },
      })
    ).toEqual(
      expect.objectContaining({
        top_right: '1, 2',
        bottom_left: '3, 4',
      })
    );
  });

  it('should throw an error on invalid parameters', () => {
    expect(() => fn(null, {})).toThrow();
    expect(() => fn(null, { top: 1, left: 2, bottom: 3 })).toThrow();
    expect(() =>
      fn(null, {
        topLeft: { type: 'geo_point', value: '1, 2' },
        bottomLeft: { type: 'geo_point', value: '3, 4' },
      })
    ).toThrow();
    expect(() =>
      fn(null, {
        topRight: { type: 'geo_point', value: '1, 2' },
        bottomRight: { type: 'geo_point', value: '3, 4' },
      })
    ).toThrow();
  });
});
