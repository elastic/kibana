/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
