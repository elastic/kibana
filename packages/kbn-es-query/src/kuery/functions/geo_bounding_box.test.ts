/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { nodeTypes } from '../node_types';
import { fields } from '../../filters/stubs';
import { IndexPatternBase } from '../..';

import * as geoBoundingBox from './geo_bounding_box';
import { JsonObject } from '@kbn/utility-types';

jest.mock('../grammar');

const params = {
  bottomRight: {
    lat: 50.73,
    lon: -135.35,
  },
  topLeft: {
    lat: 73.12,
    lon: -174.37,
  },
};

describe('kuery functions', () => {
  describe('geoBoundingBox', () => {
    let indexPattern: IndexPatternBase;

    beforeEach(() => {
      indexPattern = {
        fields,
      };
    });

    describe('buildNodeParams', () => {
      test('should return an "arguments" param', () => {
        const result = geoBoundingBox.buildNodeParams('geo', params);

        expect(result).toHaveProperty('arguments');
        expect(Object.keys(result).length).toBe(1);
      });

      test('arguments should contain the provided fieldName as a literal', () => {
        const result = geoBoundingBox.buildNodeParams('geo', params);
        const {
          arguments: [fieldName],
        } = result;

        expect(fieldName).toHaveProperty('type', 'literal');
        expect(fieldName).toHaveProperty('value', 'geo');
      });

      test('arguments should contain the provided params as named arguments with "lat, lon" string values', () => {
        const result = geoBoundingBox.buildNodeParams('geo', params);
        const {
          arguments: [, ...args],
        } = result;

        args.map((param: any) => {
          expect(param).toHaveProperty('type', 'namedArg');
          expect(['bottomRight', 'topLeft'].includes(param.name)).toBe(true);
          expect(param.value.type).toBe('literal');

          const { lat, lon } = get(params, param.name);

          expect(param.value.value).toBe(`${lat}, ${lon}`);
        });
      });
    });

    describe('toElasticsearchQuery', () => {
      test('should return an ES geo_bounding_box query representing the given node', () => {
        const node = nodeTypes.function.buildNode('geoBoundingBox', 'geo', params);
        const result = geoBoundingBox.toElasticsearchQuery(node, indexPattern);

        expect(result).toHaveProperty('geo_bounding_box');
        expect((result.geo_bounding_box as JsonObject).geo).toHaveProperty(
          'top_left',
          '73.12, -174.37'
        );
        expect((result.geo_bounding_box as JsonObject).geo).toHaveProperty(
          'bottom_right',
          '50.73, -135.35'
        );
      });

      test('should return an ES geo_bounding_box query without an index pattern', () => {
        const node = nodeTypes.function.buildNode('geoBoundingBox', 'geo', params);
        const result = geoBoundingBox.toElasticsearchQuery(node);

        expect(result).toHaveProperty('geo_bounding_box');
        expect((result.geo_bounding_box as JsonObject).geo).toHaveProperty(
          'top_left',
          '73.12, -174.37'
        );
        expect((result.geo_bounding_box as JsonObject).geo).toHaveProperty(
          'bottom_right',
          '50.73, -135.35'
        );
      });

      test('should use the ignore_unmapped parameter', () => {
        const node = nodeTypes.function.buildNode('geoBoundingBox', 'geo', params);
        const result = geoBoundingBox.toElasticsearchQuery(node, indexPattern);

        // @ts-expect-error @elastic/elasticsearch doesn't support ignore_unmapped in QueryDslGeoBoundingBoxQuery
        expect(result.geo_bounding_box!.ignore_unmapped).toBe(true);
      });

      test('should throw an error for scripted fields', () => {
        const node = nodeTypes.function.buildNode('geoBoundingBox', 'script number', params);

        expect(() => geoBoundingBox.toElasticsearchQuery(node, indexPattern)).toThrowError(
          /Geo bounding box query does not support scripted fields/
        );
      });

      test('should use a provided nested context to create a full field name', () => {
        const node = nodeTypes.function.buildNode('geoBoundingBox', 'geo', params);
        const result = geoBoundingBox.toElasticsearchQuery(
          node,
          indexPattern,
          {},
          { nested: { path: 'nestedField' } }
        );

        expect(result).toHaveProperty('geo_bounding_box');
        expect((result.geo_bounding_box as JsonObject)['nestedField.geo']).toBeDefined();
      });
    });
  });
});
