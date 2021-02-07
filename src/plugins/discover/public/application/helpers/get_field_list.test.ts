/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { indexPatternMock } from '../../__mocks__/index_pattern';
import { getFieldListFromIndexPattern } from './get_field_list';
import { indexPatternWithSourceFilterMock } from '../../__mocks__/index_pattern_with_source_filter';

describe('get field list test', () => {
  describe('no source filters', () => {
    test('returns all fields', async () => {
      expect(getFieldListFromIndexPattern(indexPatternMock, false)).toEqual([{ field: '*' }]);
    });

    test('returns all fields with unmapped fields', async () => {
      expect(getFieldListFromIndexPattern(indexPatternMock, true)).toEqual([
        { field: '*', include_unmapped: 'true' },
      ]);
    });
  });

  describe('with source filters', () => {
    test('returns all fields', async () => {
      const fields = [
        { field: '_index' },
        { field: 'message' },
        { field: 'extension' },
        { field: 'scripted' },
      ];
      expect(getFieldListFromIndexPattern(indexPatternWithSourceFilterMock, false)).toEqual(fields);
    });

    test('returns all fields with unmapped fields', async () => {
      const fields = [
        { field: '_index', include_unmapped: 'true' },
        { field: 'message', include_unmapped: 'true' },
        { field: 'extension', include_unmapped: 'true' },
        { field: 'scripted', include_unmapped: 'true' },
      ];
      expect(getFieldListFromIndexPattern(indexPatternWithSourceFilterMock, true)).toEqual(fields);
    });
  });
});
