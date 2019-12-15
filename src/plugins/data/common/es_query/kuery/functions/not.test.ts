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
import * as not from './not';

const childNode = nodeTypes.function.buildNode('is', 'extension', 'jpg');

describe('kuery functions', () => {
  describe('not', () => {
    let indexPattern: IIndexPattern;

    beforeEach(() => {
      indexPattern = ({
        fields,
      } as unknown) as IIndexPattern;
    });

    describe('buildNodeParams', () => {
      test('arguments should contain the unmodified child node', () => {
        const {
          arguments: [actualChild],
        } = not.buildNodeParams(childNode);

        expect(actualChild).toBe(childNode);
      });
    });

    describe('toElasticsearchQuery', () => {
      test("should wrap a subquery in an ES bool query's must_not clause", () => {
        const node = nodeTypes.function.buildNode('not', childNode);
        const result = not.toElasticsearchQuery(node, indexPattern);

        expect(result).toHaveProperty('bool');
        expect(Object.keys(result).length).toBe(1);

        expect(result.bool).toHaveProperty('must_not');
        expect(Object.keys(result.bool).length).toBe(1);

        expect(result.bool.must_not).toEqual(ast.toElasticsearchQuery(childNode, indexPattern));
      });
    });
  });
});
