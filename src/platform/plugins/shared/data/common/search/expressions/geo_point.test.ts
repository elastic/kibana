/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { functionWrapper } from './utils';
import { geoPointFunction } from './geo_point';

describe('interpreter/functions#geoPoint', () => {
  const fn = functionWrapper(geoPointFunction);

  it('should return a geo point structure', () => {
    expect(fn(null, { lat: 0, lon: 0 })).toHaveProperty('type', 'geo_point');
  });

  it('should construct a point from lat and lon parameters', () => {
    expect(fn(null, { lat: 1, lon: 2 })).toEqual(
      expect.objectContaining({
        value: {
          lat: 1,
          lon: 2,
        },
      })
    );
  });

  it('should construct a point from a string parameter', () => {
    expect(fn(null, { point: ['1, 2'] })).toEqual(
      expect.objectContaining({
        value: '1, 2',
      })
    );
  });

  it('should construct a point from two numeric values', () => {
    expect(fn(null, { point: [1, 2] })).toEqual(
      expect.objectContaining({
        value: [1, 2],
      })
    );
  });

  it('should throw an error when lat or lon parameter is missing', () => {
    expect(() => fn(null, { lat: 1 })).toThrow();
    expect(() => fn(null, { lon: 2 })).toThrow();
  });

  it('should throw an error when the point parameter is invalid', () => {
    expect(() => fn(null, { point: [] })).toThrow();
    expect(() => fn(null, { point: [1] })).toThrow();
    expect(() => fn(null, { point: [1, 2, 3] })).toThrow();
  });
});
