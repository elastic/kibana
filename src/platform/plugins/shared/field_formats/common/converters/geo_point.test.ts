/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GeoPointFormat } from './geo_point';
import { expectReactElementWithNull, expectReactElementAsArray } from '../test_utils';

describe('GeoPoint Format', () => {
  describe('output format', () => {
    test('"lat_lon_string"', () => {
      const geoPointFormat = new GeoPointFormat(
        {
          transform: 'lat_lon_string',
        },
        jest.fn()
      );
      expect(geoPointFormat.convertToText({ type: 'Point', coordinates: [125.6, 10.1] })).toBe(
        '10.1,125.6'
      );
      expect(geoPointFormat.convertToReact({ type: 'Point', coordinates: [125.6, 10.1] })).toBe(
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
      expect(geoPointFormat.convertToText({ type: 'Point', coordinates: [125.6, 10.1] })).toBe(
        'POINT (125.6 10.1)'
      );
      expect(geoPointFormat.convertToReact({ type: 'Point', coordinates: [125.6, 10.1] })).toBe(
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
      expect(geoPointFormat.convertToText({ type: 'Point', coordinates: [125.6, 10.1] })).toBe(
        '10.1,125.6'
      );
      expect(geoPointFormat.convertToReact({ type: 'Point', coordinates: [125.6, 10.1] })).toBe(
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
      expect(geoPointFormat.convertToText({ lat: 10.1, lon: 125.6 })).toBe('10.1,125.6');
      expect(geoPointFormat.convertToReact({ lat: 10.1, lon: 125.6 })).toBe('10.1,125.6');
    });

    test('Geopoint expressed as a string with the format: "lat,lon"', () => {
      const geoPointFormat = new GeoPointFormat(
        {
          transform: 'lat_lon_string',
        },
        jest.fn()
      );
      expect(geoPointFormat.convertToText('10.1,125.6')).toBe('10.1,125.6');
      expect(geoPointFormat.convertToReact('10.1,125.6')).toBe('10.1,125.6');
    });

    test('Geopoint expressed as a Well-Known Text POINT with the format: "POINT (lon lat)"', () => {
      const geoPointFormat = new GeoPointFormat(
        {
          transform: 'lat_lon_string',
        },
        jest.fn()
      );
      expect(geoPointFormat.convertToText('POINT (125.6 10.1)')).toBe('10.1,125.6');
      expect(geoPointFormat.convertToReact('POINT (125.6 10.1)')).toBe('10.1,125.6');
    });

    test('non-geopoint', () => {
      const geoPointFormat = new GeoPointFormat(
        {
          transform: 'lat_lon_string',
        },
        jest.fn()
      );
      expect(geoPointFormat.convertToText('notgeopoint')).toBe('notgeopoint');
      expect(geoPointFormat.convertToReact('notgeopoint')).toBe('notgeopoint');
    });

    test('missing value', () => {
      const geoPointFormat = new GeoPointFormat(
        {
          transform: 'lat_lon_string',
        },
        jest.fn()
      );
      expect(geoPointFormat.convertToText(null)).toBe('(null)');
      expect(geoPointFormat.convertToText(undefined)).toBe('(null)');
      expectReactElementWithNull(geoPointFormat.convertToReact(null));
      expectReactElementWithNull(geoPointFormat.convertToReact(undefined));
    });

    test('convertToReact returns raw string for unhighlighted content (React escapes at render)', () => {
      const geoPointFormat = new GeoPointFormat(
        {
          transform: 'lat_lon_string',
        },
        jest.fn()
      );
      expect(geoPointFormat.convertToReact('<script>alert("test")</script>')).toBe(
        '<script>alert("test")</script>'
      );
    });

    test('wraps a multi-value array with bracket notation', () => {
      const geoPointFormat = new GeoPointFormat({ transform: 'lat_lon_string' }, jest.fn());

      expect(
        geoPointFormat.convertToText([
          { type: 'Point', coordinates: [125.6, 10.1] },
          { type: 'Point', coordinates: [0, 51.5] },
        ])
      ).toBe('["10.1,125.6","51.5,0"]');
      expectReactElementAsArray(
        geoPointFormat.convertToReact([
          { type: 'Point', coordinates: [125.6, 10.1] },
          { type: 'Point', coordinates: [0, 51.5] },
        ]),
        ['10.1,125.6', '51.5,0']
      );
    });

    test('returns the single element without brackets for a one-element array', () => {
      const geoPointFormat = new GeoPointFormat({ transform: 'lat_lon_string' }, jest.fn());

      expect(geoPointFormat.convertToText([{ type: 'Point', coordinates: [125.6, 10.1] }])).toBe(
        '["10.1,125.6"]'
      );
      expect(geoPointFormat.convertToReact([{ type: 'Point', coordinates: [125.6, 10.1] }])).toBe(
        '10.1,125.6'
      );
    });
  });
});
