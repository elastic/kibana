/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { nodeTypes } from '../node_types';
import { fields } from '../../filters/stubs';
import { IndexPatternBase } from '../..';

import * as geoPolygon from './geo_polygon';

jest.mock('../grammar');

const points = [
  {
    lat: 69.77,
    lon: -171.56,
  },
  {
    lat: 50.06,
    lon: -169.1,
  },
  {
    lat: 69.16,
    lon: -125.85,
  },
];

describe('kuery functions', () => {
  describe('geoPolygon', () => {
    let indexPattern: IndexPatternBase;

    beforeEach(() => {
      indexPattern = {
        fields,
      };
    });

    describe('buildNodeParams', () => {
      test('should return an "arguments" param', () => {
        const result = geoPolygon.buildNodeParams('geo', points);

        expect(result).toHaveProperty('arguments');
        expect(Object.keys(result).length).toBe(1);
      });

      test('arguments should contain the provided fieldName as a literal', () => {
        const result = geoPolygon.buildNodeParams('geo', points);
        const {
          arguments: [fieldName],
        } = result;

        expect(fieldName).toHaveProperty('type', 'literal');
        expect(fieldName).toHaveProperty('value', 'geo');
      });

      test('arguments should contain the provided points literal "lat, lon" string values', () => {
        const result = geoPolygon.buildNodeParams('geo', points);
        const {
          arguments: [, ...args],
        } = result;

        args.forEach((param: any, index: number) => {
          const expectedPoint = points[index];
          const expectedLatLon = `${expectedPoint.lat}, ${expectedPoint.lon}`;

          expect(param).toHaveProperty('type', 'literal');
          expect(param.value).toBe(expectedLatLon);
        });
      });
    });

    describe('toElasticsearchQuery', () => {
      test('should return an ES geo_polygon query representing the given node', () => {
        const node = nodeTypes.function.buildNode('geoPolygon', 'geo', points);
        const result = geoPolygon.toElasticsearchQuery(node, indexPattern);

        expect(result).toHaveProperty('geo_polygon');
        expect((result.geo_polygon as any).geo).toHaveProperty('points');

        (result.geo_polygon as any).geo.points.forEach((point: any, index: number) => {
          const expectedLatLon = `${points[index].lat}, ${points[index].lon}`;

          expect(point).toBe(expectedLatLon);
        });
      });

      test('should return an ES geo_polygon query without an index pattern', () => {
        const node = nodeTypes.function.buildNode('geoPolygon', 'geo', points);
        const result = geoPolygon.toElasticsearchQuery(node);

        expect(result).toHaveProperty('geo_polygon');
        expect((result.geo_polygon as any).geo).toHaveProperty('points');

        (result.geo_polygon as any).geo.points.forEach((point: any, index: number) => {
          const expectedLatLon = `${points[index].lat}, ${points[index].lon}`;

          expect(point).toBe(expectedLatLon);
        });
      });

      test('should use the ignore_unmapped parameter', () => {
        const node = nodeTypes.function.buildNode('geoPolygon', 'geo', points);
        const result = geoPolygon.toElasticsearchQuery(node, indexPattern);

        expect((result.geo_polygon as any).ignore_unmapped).toBe(true);
      });

      test('should throw an error for scripted fields', () => {
        const node = nodeTypes.function.buildNode('geoPolygon', 'script number', points);
        expect(() => geoPolygon.toElasticsearchQuery(node, indexPattern)).toThrowError(
          /Geo polygon query does not support scripted fields/
        );
      });

      test('should use a provided nested context to create a full field name', () => {
        const node = nodeTypes.function.buildNode('geoPolygon', 'geo', points);
        const result = geoPolygon.toElasticsearchQuery(
          node,
          indexPattern,
          {},
          { nested: { path: 'nestedField' } }
        );

        expect(result).toHaveProperty('geo_polygon');
        expect((result.geo_polygon as any)['nestedField.geo']).toBeDefined();
      });
    });
  });
});
