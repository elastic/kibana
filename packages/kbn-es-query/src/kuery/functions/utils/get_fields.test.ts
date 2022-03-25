/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewBase } from '../../..';
import { fields } from '../../../filters/stubs';

import { nodeTypes } from '../../index';
import { getFields } from './get_fields';

jest.mock('../../grammar');

describe('getFields', () => {
  let indexPattern: DataViewBase;

  beforeEach(() => {
    indexPattern = {
      fields,
    } as unknown as DataViewBase;
  });

  describe('field names without a wildcard', () => {
    test('should return an empty array if the field does not exist in the index pattern', () => {
      const fieldNameNode = nodeTypes.literal.buildNode('nonExistentField');
      const actual = getFields(fieldNameNode, indexPattern);

      expect(actual).toEqual([]);
    });

    test('should return the single matching field in an array', () => {
      const fieldNameNode = nodeTypes.literal.buildNode('extension');
      const results = getFields(fieldNameNode, indexPattern);

      expect(results).toHaveLength(1);
      expect(Array.isArray(results)).toBeTruthy();
      expect(results![0].name).toBe('extension');
    });

    test('should not match a wildcard in a literal node', () => {
      const indexPatternWithWildField: DataViewBase = {
        title: 'wildIndex',
        fields: [
          {
            name: 'foo*',
          },
        ],
      } as unknown as DataViewBase;

      const fieldNameNode = nodeTypes.literal.buildNode('foo*');
      const results = getFields(fieldNameNode, indexPatternWithWildField);

      expect(results).toHaveLength(1);
      expect(Array.isArray(results)).toBeTruthy();
      expect(results![0].name).toBe('foo*');

      const actual = getFields(nodeTypes.literal.buildNode('fo*'), indexPatternWithWildField);
      expect(actual).toEqual([]);
    });
  });

  describe('field name patterns with a wildcard', () => {
    test('should return an empty array if test does not match any fields in the index pattern', () => {
      const fieldNameNode = nodeTypes.wildcard.buildNode('nonExistent*');
      const actual = getFields(fieldNameNode, indexPattern);

      expect(actual).toEqual([]);
    });

    test('should return all fields that match the pattern in an array', () => {
      const fieldNameNode = nodeTypes.wildcard.buildNode('machine*');
      const results = getFields(fieldNameNode, indexPattern);

      expect(Array.isArray(results)).toBeTruthy();
      expect(results).toHaveLength(2);
      expect(results!.find((field) => field.name === 'machine.os')).toBeDefined();
      expect(results!.find((field) => field.name === 'machine.os.raw')).toBeDefined();
    });
  });
});
