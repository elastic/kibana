/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { nodeTypes } from '../node_types';
import { fields } from '../../filters/stubs';
import * as ast from '../ast';
import * as and from './and';
import { DataViewBase } from '../../es_query';

jest.mock('../grammar');

const childNode1 = nodeTypes.function.buildNode('is', 'machine.os', 'osx');
const childNode2 = nodeTypes.function.buildNode('is', 'extension', 'jpg');

describe('kuery functions', () => {
  describe('and', () => {
    let indexPattern: DataViewBase;

    beforeEach(() => {
      indexPattern = {
        fields,
        title: 'dataView',
      };
    });

    describe('buildNodeParams', () => {
      test('arguments should contain the unmodified child nodes', () => {
        const result = and.buildNodeParams([childNode1, childNode2]);
        const {
          arguments: [actualChildNode1, actualChildNode2],
        } = result;

        expect(actualChildNode1).toBe(childNode1);
        expect(actualChildNode2).toBe(childNode2);
      });
    });

    describe('toElasticsearchQuery', () => {
      test("should wrap subqueries in an ES bool query's filter clause", () => {
        const node = nodeTypes.function.buildNode('and', [childNode1, childNode2]);
        const result = and.toElasticsearchQuery(node, indexPattern);

        expect(result).toHaveProperty('bool');
        expect(Object.keys(result).length).toBe(1);
        expect(result.bool).toHaveProperty('filter');
        expect(Object.keys(result.bool).length).toBe(1);

        expect(result.bool.filter).toEqual(
          [childNode1, childNode2].map((childNode) =>
            ast.toElasticsearchQuery(childNode, indexPattern)
          )
        );
      });

      test("should wrap subqueries in an ES bool query's must clause for scoring if enabled", () => {
        const node = nodeTypes.function.buildNode('and', [childNode1, childNode2]);
        const result = and.toElasticsearchQuery(node, indexPattern, {
          filtersInMustClause: true,
        });

        expect(result).toHaveProperty('bool');
        expect(Object.keys(result).length).toBe(1);
        expect(result.bool).toHaveProperty('must');
        expect(Object.keys(result.bool).length).toBe(1);

        expect(result.bool.must).toEqual(
          [childNode1, childNode2].map((childNode) =>
            ast.toElasticsearchQuery(childNode, indexPattern)
          )
        );
      });
    });
  });
});
