/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewBase } from '../..';
import { fields } from '../../filters/stubs';
import * as ast from '../ast';
import * as is from './is';
import * as not from './not';

jest.mock('../grammar');

const childNode = is.buildNode('extension', 'jpg');

describe('kuery functions', () => {
  describe('not', () => {
    let indexPattern: DataViewBase;

    beforeEach(() => {
      indexPattern = {
        fields,
        title: 'dataView',
      };
    });

    describe('buildNode', () => {
      test('arguments should contain the unmodified child node', () => {
        const {
          arguments: [actualChild],
        } = not.buildNode(childNode);

        expect(actualChild).toBe(childNode);
      });
    });

    describe('toElasticsearchQuery', () => {
      test("should wrap a subquery in an ES bool query's must_not clause", () => {
        const node = not.buildNode(childNode);
        const result = not.toElasticsearchQuery(node, indexPattern);

        expect(result).toHaveProperty('bool');
        expect(Object.keys(result).length).toBe(1);

        expect(result.bool).toHaveProperty('must_not');
        expect(Object.keys(result.bool!).length).toBe(1);

        expect(result.bool!.must_not).toEqual(ast.toElasticsearchQuery(childNode, indexPattern));
      });
    });
  });
});
