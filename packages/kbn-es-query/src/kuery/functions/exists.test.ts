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

jest.mock('../grammar');

// @ts-ignore
import * as exists from './exists';

describe('kuery functions', () => {
  describe('exists', () => {
    let indexPattern: DataViewBase;

    beforeEach(() => {
      indexPattern = {
        fields,
        title: 'dataView',
      };
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
