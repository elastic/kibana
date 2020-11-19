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

import * as ast from '../ast';

// @ts-ignore
import * as nested from './nested';

const childNode = nodeTypes.function.buildNode('is', 'child', 'foo');

describe('kuery functions', () => {
  describe('nested', () => {
    let indexPattern: IIndexPattern;

    beforeEach(() => {
      indexPattern = ({
        fields,
      } as unknown) as IIndexPattern;
    });

    describe('buildNodeParams', () => {
      test('arguments should contain the unmodified child nodes', () => {
        const result = nested.buildNodeParams('nestedField', childNode);
        const {
          arguments: [resultPath, resultChildNode],
        } = result;

        expect(ast.toElasticsearchQuery(resultPath)).toBe('nestedField');
        expect(resultChildNode).toBe(childNode);
      });
    });

    describe('toElasticsearchQuery', () => {
      test('should wrap subqueries in an ES nested query', () => {
        const node = nodeTypes.function.buildNode('nested', 'nestedField', childNode);
        const result = nested.toElasticsearchQuery(node, indexPattern);

        expect(result).toHaveProperty('nested');
        expect(Object.keys(result).length).toBe(1);

        expect(result.nested.path).toBe('nestedField');
        expect(result.nested.score_mode).toBe('none');
      });

      test('should pass the nested path to subqueries so the full field name can be used', () => {
        const node = nodeTypes.function.buildNode('nested', 'nestedField', childNode);
        const result = nested.toElasticsearchQuery(node, indexPattern);
        const expectedSubQuery = ast.toElasticsearchQuery(
          nodeTypes.function.buildNode('is', 'nestedField.child', 'foo')
        );

        expect(result.nested.query).toEqual(expectedSubQuery);
      });
    });
  });
});
