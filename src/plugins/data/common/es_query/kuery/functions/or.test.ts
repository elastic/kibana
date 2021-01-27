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
import * as or from './or';

const childNode1 = nodeTypes.function.buildNode('is', 'machine.os', 'osx');
const childNode2 = nodeTypes.function.buildNode('is', 'extension', 'jpg');

describe('kuery functions', () => {
  describe('or', () => {
    let indexPattern: IIndexPattern;

    beforeEach(() => {
      indexPattern = ({
        fields,
      } as unknown) as IIndexPattern;
    });

    describe('buildNodeParams', () => {
      test('arguments should contain the unmodified child nodes', () => {
        const result = or.buildNodeParams([childNode1, childNode2]);
        const {
          arguments: [actualChildNode1, actualChildNode2],
        } = result;

        expect(actualChildNode1).toBe(childNode1);
        expect(actualChildNode2).toBe(childNode2);
      });
    });

    describe('toElasticsearchQuery', () => {
      test("should wrap subqueries in an ES bool query's should clause", () => {
        const node = nodeTypes.function.buildNode('or', [childNode1, childNode2]);
        const result = or.toElasticsearchQuery(node, indexPattern);

        expect(result).toHaveProperty('bool');
        expect(Object.keys(result).length).toBe(1);
        expect(result.bool).toHaveProperty('should');
        expect(result.bool.should).toEqual(
          [childNode1, childNode2].map((childNode) =>
            ast.toElasticsearchQuery(childNode, indexPattern)
          )
        );
      });

      test('should require one of the clauses to match', () => {
        const node = nodeTypes.function.buildNode('or', [childNode1, childNode2]);
        const result = or.toElasticsearchQuery(node, indexPattern);

        expect(result.bool).toHaveProperty('minimum_should_match', 1);
      });
    });
  });
});
