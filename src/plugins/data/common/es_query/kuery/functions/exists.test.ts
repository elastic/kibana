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

import { nodeTypes } from '../node_types';
import { fields } from '../../../index_patterns/mocks';
import { IIndexPattern } from '../../../index_patterns';

// @ts-ignore
import * as exists from './exists';

describe('kuery functions', () => {
  describe('exists', () => {
    let indexPattern: IIndexPattern;

    beforeEach(() => {
      indexPattern = ({
        fields,
      } as unknown) as IIndexPattern;
    });

    describe('buildNodeParams', () => {
      test('should return a single "arguments" param', () => {
        const result = exists.buildNodeParams('response');

        expect(result).toHaveProperty('arguments');
        expect(Object.keys(result).length).toBe(1);
      });

      test('arguments should contain the provided fieldName as a literal', () => {
        const {
          arguments: [arg],
        } = exists.buildNodeParams('response');

        expect(arg).toHaveProperty('type', 'literal');
        expect(arg).toHaveProperty('value', 'response');
      });
    });

    describe('toElasticsearchQuery', () => {
      test('should return an ES exists query', () => {
        const expected = {
          exists: { field: 'response' },
        };
        const existsNode = nodeTypes.function.buildNode('exists', 'response');
        const result = exists.toElasticsearchQuery(existsNode, indexPattern);

        expect(expected).toEqual(result);
      });

      test('should return an ES exists query without an index pattern', () => {
        const expected = {
          exists: { field: 'response' },
        };
        const existsNode = nodeTypes.function.buildNode('exists', 'response');
        const result = exists.toElasticsearchQuery(existsNode);

        expect(expected).toEqual(result);
      });

      test('should throw an error for scripted fields', () => {
        const existsNode = nodeTypes.function.buildNode('exists', 'script string');
        expect(() => exists.toElasticsearchQuery(existsNode, indexPattern)).toThrowError(
          /Exists query does not support scripted fields/
        );
      });

      test('should use a provided nested context to create a full field name', () => {
        const expected = {
          exists: { field: 'nestedField.response' },
        };
        const existsNode = nodeTypes.function.buildNode('exists', 'response');
        const result = exists.toElasticsearchQuery(
          existsNode,
          indexPattern,
          {},
          { nested: { path: 'nestedField' } }
        );

        expect(expected).toEqual(result);
      });
    });
  });
});
