/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { fields } from '../../../../index_patterns/mocks';

import { nodeTypes } from '../../index';
import { IIndexPattern, IFieldType } from '../../../../index_patterns';

// @ts-ignore
import { getFields } from './get_fields';

describe('getFields', () => {
  let indexPattern: IIndexPattern;

  beforeEach(() => {
    indexPattern = ({
      fields,
    } as unknown) as IIndexPattern;
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
      const indexPatternWithWildField = {
        title: 'wildIndex',
        fields: [
          {
            name: 'foo*',
          },
        ],
      } as IIndexPattern;

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
      expect(results!.find((field: IFieldType) => field.name === 'machine.os')).toBeDefined();
      expect(results!.find((field: IFieldType) => field.name === 'machine.os.raw')).toBeDefined();
    });
  });
});
