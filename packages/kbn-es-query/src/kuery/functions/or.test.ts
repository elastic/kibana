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
import * as or from './or';

jest.mock('../grammar');

const childNode1 = is.buildNode('machine.os', 'osx');
const childNode2 = is.buildNode('extension', 'jpg');

describe('kuery functions', () => {
  describe('or', () => {
    let indexPattern: DataViewBase;

    beforeEach(() => {
      indexPattern = {
        fields,
        title: 'dataView',
      };
    });

    describe('buildNodeParams', () => {
      test('arguments should contain the unmodified child nodes', () => {
        const result = or.buildNode([childNode1, childNode2]);
        const {
          arguments: [actualChildNode1, actualChildNode2],
        } = result;

        expect(actualChildNode1).toBe(childNode1);
        expect(actualChildNode2).toBe(childNode2);
      });
    });

    describe('toElasticsearchQuery', () => {
      test("should wrap subqueries in an ES bool query's should clause", () => {
        const node = or.buildNode([childNode1, childNode2]);
        const result = or.toElasticsearchQuery(node, indexPattern);

        expect(result).toHaveProperty('bool');
        expect(Object.keys(result).length).toBe(1);
        expect(result.bool).toHaveProperty('should');
        expect(result.bool!.should).toEqual(
          [childNode1, childNode2].map((childNode) =>
            ast.toElasticsearchQuery(childNode, indexPattern)
          )
        );
      });

      test('should require one of the clauses to match', () => {
        const node = or.buildNode([childNode1, childNode2]);
        const result = or.toElasticsearchQuery(node, indexPattern);

        expect(result.bool).toHaveProperty('minimum_should_match', 1);
      });
    });
  });
});
