/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { nodeTypes } from '../node_types';
import { fields } from '../../filters/stubs';
import { DataViewBase } from '../..';

import * as ast from '../ast';

import * as nested from './nested';

jest.mock('../grammar');

const childNode = nodeTypes.function.buildNode('is', 'child', 'foo');

describe('kuery functions', () => {
  describe('nested', () => {
    let indexPattern: DataViewBase;

    beforeEach(() => {
      indexPattern = {
        fields,
        title: 'dataView',
      };
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

        expect(result.nested?.path).toBe('nestedField');
        expect(result.nested?.score_mode).toBe('none');
      });

      test('should pass the nested path to subqueries so the full field name can be used', () => {
        const node = nodeTypes.function.buildNode('nested', 'nestedField', childNode);
        const result = nested.toElasticsearchQuery(node, indexPattern);
        const expectedSubQuery = ast.toElasticsearchQuery(
          nodeTypes.function.buildNode('is', 'nestedField.child', 'foo')
        );

        expect(result.nested!.query).toEqual(expectedSubQuery);
      });
    });
  });
});
