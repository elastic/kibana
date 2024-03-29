/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GeoPointFormat } from './geo_point';

describe('GeoPoint Format', () => {
  describe('output format', () => {
    test('"lat_lon_string"', () => {
      const geoPointFormat = new GeoPointFormat(
        {
          transform: 'lat_lon_string',
        },
        jest.fn()
      );
      expect(geoPointFormat.convert({ type: 'Point', coordinates: [125.6, 10.1] })).toBe(
        '10.1,125.6'
      );
    });

    test('"WKT"', () => {
      const geoPointFormat = new GeoPointFormat(
        {
          transform: 'wkt',
        },
        jest.fn()
      );
      expect(geoPointFormat.convert({ type: 'Point', coordinates: [125.6, 10.1] })).toBe(
        'POINT (125.6 10.1)'
      );
    });
  });

  describe('inputs', () => {
    test('Geopoint expressed as an GeoJson geometry', () => {
      const geoPointFormat = new GeoPointFormat(
        {
          transform: 'lat_lon_string',
        },
        jest.fn()
      );
      expect(geoPointFormat.convert({ type: 'Point', coordinates: [125.6, 10.1] })).toBe(
        '10.1,125.6'
      );
    });

    test('Geopoint expressed as an object, with lat and lon keys', () => {
      const geoPointFormat = new GeoPointFormat(
        {
          transform: 'lat_lon_string',
        },
        jest.fn()
      );
      expect(geoPointFormat.convert({ lat: 10.1, lon: 125.6 })).toBe('10.1,125.6');
    });

    test('Geopoint expressed as a string with the format: "lat,lon"', () => {
      const geoPointFormat = new GeoPointFormat(
        {
          transform: 'lat_lon_string',
        },
        jest.fn()
      );
      expect(geoPointFormat.convert('10.1,125.6')).toBe('10.1,125.6');
    });

    test('Geopoint expressed as a Well-Known Text POINT with the format: "POINT (lon lat)"', () => {
      const geoPointFormat = new GeoPointFormat(
        {
          transform: 'lat_lon_string',
        },
        jest.fn()
      );
      expect(geoPointFormat.convert('POINT (125.6 10.1)')).toBe('10.1,125.6');
    });

    test('non-geopoint', () => {
      const geoPointFormat = new GeoPointFormat(
        {
          transform: 'lat_lon_string',
        },
        jest.fn()
      );
      expect(geoPointFormat.convert('notgeopoint')).toBe('notgeopoint');
    });
  });
});
