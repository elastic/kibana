/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { nodeTypes } from './index';

import { buildNode, buildNodeWithArgumentNodes, toElasticsearchQuery } from './function';
import { toElasticsearchQuery as isFunctionToElasticsearchQuery } from '../functions/is';
import { DataViewBase } from '../../es_query';
import { fields } from '../../filters/stubs/fields.mocks';

jest.mock('../grammar');

describe('kuery node types', () => {
  describe('function', () => {
    let indexPattern: DataViewBase;

    beforeEach(() => {
      indexPattern = {
        fields,
        title: 'dataView',
      };
    });

    describe('buildNode', () => {
      test('should return a node representing the given kuery function', () => {
        const result = buildNode('is', 'extension', 'jpg');

        expect(result).toHaveProperty('type', 'function');
        expect(result).toHaveProperty('function', 'is');
        expect(result).toHaveProperty('arguments');
      });
    });

    describe('buildNodeWithArgumentNodes', () => {
      test('should return a function node with the given argument list untouched', () => {
        const fieldNameLiteral = nodeTypes.literal.buildNode('extension');
        const valueLiteral = nodeTypes.literal.buildNode('jpg');
        const argumentNodes = [fieldNameLiteral, valueLiteral];
        const result = buildNodeWithArgumentNodes('is', argumentNodes);

        expect(result).toHaveProperty('type', 'function');
        expect(result).toHaveProperty('function', 'is');
        expect(result).toHaveProperty('arguments');
        expect(result.arguments).toBe(argumentNodes);
        expect(result.arguments).toEqual(argumentNodes);
      });
    });

    describe('toElasticsearchQuery', () => {
      test("should return the given function type's ES query representation", () => {
        const node = buildNode('is', 'extension', 'jpg');
        const expected = isFunctionToElasticsearchQuery(node, indexPattern);
        const result = toElasticsearchQuery(node, indexPattern);

        expect(expected).toEqual(result);
      });
    });
  });
});
