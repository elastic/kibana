/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { nodeTypes } from '.';

import {
  buildNode,
  buildNodeWithArgumentNodes,
  toElasticsearchQuery,
  toKqlExpression,
} from './function';
import {
  KqlIsFunctionNode,
  toElasticsearchQuery as isFunctionToElasticsearchQuery,
} from '../functions/is';
import { DataViewBase } from '../../es_query';
import { fields } from '../../filters/stubs/fields.mocks';

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
        const node = buildNode('is', 'extension', 'jpg') as KqlIsFunctionNode;
        const expected = isFunctionToElasticsearchQuery(node, indexPattern);
        const result = toElasticsearchQuery(node, indexPattern);

        expect(expected).toEqual(result);
      });
    });

    describe('toKqlExpression', () => {
      test("should return the given function type's KQL representation", () => {
        const node = buildNode('is', 'extension', 'jpg') as KqlIsFunctionNode;
        const result = toKqlExpression(node);
        expect(result).toEqual('extension: jpg');
      });
    });
  });
});
