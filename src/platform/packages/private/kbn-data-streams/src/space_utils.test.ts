/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SPACE_ID_SEPARATOR,
  SYSTEM_SPACE_PROPERTY,
  containsSpaceSeparator,
  throwOnIdWithSeparator,
  generateSpacePrefixedId,
  extractSpaceFromId,
  validateSpaceInId,
  decorateDocumentWithSpace,
  buildSpaceFilter,
  buildSpaceAgnosticFilter,
} from './space_utils';

describe('space_utils', () => {
  describe('SPACE_ID_SEPARATOR', () => {
    it('should be "::"', () => {
      expect(SPACE_ID_SEPARATOR).toBe('::');
    });
  });

  describe('SYSTEM_SPACE_PROPERTY', () => {
    it('should be "kibana.space_ids"', () => {
      expect(SYSTEM_SPACE_PROPERTY).toBe('kibana.space_ids');
    });
  });

  describe('containsSpaceSeparator', () => {
    it('should return true if ID contains separator', () => {
      expect(containsSpaceSeparator('myspace::doc123')).toBe(true);
      expect(containsSpaceSeparator('default::uuid-here')).toBe(true);
    });

    it('should return false if ID does not contain separator', () => {
      expect(containsSpaceSeparator('doc123')).toBe(false);
      expect(containsSpaceSeparator('uuid-with-dashes')).toBe(false);
      expect(containsSpaceSeparator('single:colon')).toBe(false);
    });
  });

  describe('throwOnIdWithSeparator', () => {
    it('should throw if ID contains separator', () => {
      expect(() => throwOnIdWithSeparator('myspace::doc123')).toThrow(/IDs cannot contain '::'/);
    });

    it('should not throw if ID does not contain separator', () => {
      expect(() => throwOnIdWithSeparator('doc123')).not.toThrow();
      expect(() => throwOnIdWithSeparator('uuid-with-dashes')).not.toThrow();
      expect(() => throwOnIdWithSeparator('single:colon')).not.toThrow();
    });
  });

  describe('generateSpacePrefixedId', () => {
    it('should prefix provided ID with space', () => {
      expect(generateSpacePrefixedId('myspace', 'doc123')).toBe('myspace::doc123');
      expect(generateSpacePrefixedId('default', 'abc')).toBe('default::abc');
    });

    it('should generate UUID when ID is not provided', () => {
      const result = generateSpacePrefixedId('myspace');
      expect(result).toMatch(/^myspace::[0-9a-f-]{36}$/);
    });

    it('should handle empty space string', () => {
      expect(generateSpacePrefixedId('', 'doc123')).toBe('::doc123');
    });
  });

  describe('extractSpaceFromId', () => {
    it('should extract space and rawId from prefixed ID', () => {
      expect(extractSpaceFromId('myspace::doc123')).toEqual({
        space: 'myspace',
        rawId: 'doc123',
      });
      expect(extractSpaceFromId('default::uuid-here')).toEqual({
        space: 'default',
        rawId: 'uuid-here',
      });
    });

    it('should handle IDs with multiple separators', () => {
      expect(extractSpaceFromId('space::part1::part2')).toEqual({
        space: 'space::part1',
        rawId: 'part2',
      });
    });

    it('should throw if ID has no separator', () => {
      expect(() => extractSpaceFromId('doc123')).toThrow(/missing space prefix/);
    });
  });

  describe('validateSpaceInId', () => {
    it('should not throw if ID belongs to expected space', () => {
      expect(() => validateSpaceInId('myspace::doc123', 'myspace')).not.toThrow();
    });

    it('should throw if ID belongs to different space', () => {
      expect(() => validateSpaceInId('other::doc123', 'myspace')).toThrow(
        /Space mismatch: document belongs to 'other', not 'myspace'/
      );
    });

    it('should throw if ID has no separator', () => {
      expect(() => validateSpaceInId('doc123', 'myspace')).toThrow(/missing space prefix/);
    });
  });

  describe('decorateDocumentWithSpace', () => {
    it('should add kibana.space_ids property to document', () => {
      const doc = { field: 'value' };
      const result = decorateDocumentWithSpace(doc, 'myspace');
      expect(result).toEqual({
        field: 'value',
        kibana: { space_ids: ['myspace'] },
      });
    });

    it('should preserve existing properties', () => {
      const doc = { a: 1, b: 'two', c: true };
      const result = decorateDocumentWithSpace(doc, 'default');
      expect(result).toEqual({
        a: 1,
        b: 'two',
        c: true,
        kibana: { space_ids: ['default'] },
      });
    });
  });

  describe('buildSpaceFilter', () => {
    it('should return term filter for space', () => {
      expect(buildSpaceFilter('myspace')).toEqual({
        term: { 'kibana.space_ids': 'myspace' },
      });
    });
  });

  describe('buildSpaceAgnosticFilter', () => {
    it('should return must_not exists filter for kibana.space_ids', () => {
      expect(buildSpaceAgnosticFilter()).toEqual({
        bool: {
          must_not: {
            exists: { field: 'kibana.space_ids' },
          },
        },
      });
    });
  });
});
