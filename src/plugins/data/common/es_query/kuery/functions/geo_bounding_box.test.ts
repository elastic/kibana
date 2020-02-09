/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { get } from 'lodash';
import { nodeTypes } from '../node_types';
import { fields } from '../../../index_patterns/mocks';
import { IIndexPattern } from '../../../index_patterns';

// @ts-ignore
import * as geoBoundingBox from './geo_bounding_box';

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
    let indexPattern: IIndexPattern;

    beforeEach(() => {
      indexPattern = ({
        fields,
      } as unknown) as IIndexPattern;
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
        expect(result.geo_bounding_box.geo).toHaveProperty('top_left', '73.12, -174.37');
        expect(result.geo_bounding_box.geo).toHaveProperty('bottom_right', '50.73, -135.35');
      });

      test('should return an ES geo_bounding_box query without an index pattern', () => {
        const node = nodeTypes.function.buildNode('geoBoundingBox', 'geo', params);
        const result = geoBoundingBox.toElasticsearchQuery(node);

        expect(result).toHaveProperty('geo_bounding_box');
        expect(result.geo_bounding_box.geo).toHaveProperty('top_left', '73.12, -174.37');
        expect(result.geo_bounding_box.geo).toHaveProperty('bottom_right', '50.73, -135.35');
      });

      test('should use the ignore_unmapped parameter', () => {
        const node = nodeTypes.function.buildNode('geoBoundingBox', 'geo', params);
        const result = geoBoundingBox.toElasticsearchQuery(node, indexPattern);

        expect(result.geo_bounding_box.ignore_unmapped).toBe(true);
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
        expect(result.geo_bounding_box['nestedField.geo']).toBeDefined();
      });
    });
  });
});
