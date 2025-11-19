/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toValidIndexName } from './to_valid_index_name';

describe('toValidIndexName', () => {
  it('should convert camelCase to kebab-case', () => {
    expect(toValidIndexName('camelCaseInput')).toBe('camel-case-input');
  });

  it('should replace forbidden characters', () => {
    expect(toValidIndexName('foo/bar*baz?qux"quux<quuz>corge|grault,garply#waldo:fred')).toBe(
      'foo-bar-baz-qux-quux-quuz-corge-grault-garply-waldo-fred'
    );
  });

  it('should remove leading -, _, +', () => {
    expect(toValidIndexName('-foo')).toBe('foo');
    expect(toValidIndexName('_foo')).toBe('foo');
    expect(toValidIndexName('+foo')).toBe('foo');
  });

  it('should remove trailing hyphens', () => {
    expect(toValidIndexName('foo-')).toBe('foo');
    expect(toValidIndexName('foo--')).toBe('foo');
  });

  it('should handle multiple forbidden characters together', () => {
    expect(toValidIndexName('foo*?bar')).toBe('foo-bar');
  });

  it('should handle spaces and mixed casing', () => {
    expect(toValidIndexName('  Foo BarBaz ')).toBe('foo-bar-baz');
  });

  it('should handle numbers and symbols', () => {
    expect(toValidIndexName('foo123')).toBe('foo-123');
    expect(toValidIndexName('foo#123')).toBe('foo-123');
  });

  it('should not remove valid underscores in the middle', () => {
    expect(toValidIndexName('foo_bar')).toBe('foo-bar');
  });

  it('should handle already valid index names', () => {
    expect(toValidIndexName('valid-index-name')).toBe('valid-index-name');
  });

  it('should handle valid single character input', () => {
    expect(toValidIndexName('a')).toBe('a');
  });

  describe('error scenarios', () => {
    it('should throw on empty string', () => {
      expect(() => toValidIndexName('')).toThrow('Input string must be non-empty');
      expect(() => toValidIndexName('   ')).toThrow('Input string must be non-empty');
    });

    it('should throw on single whitespace or forbidden character input', () => {
      expect(() => toValidIndexName(' ')).toThrow('Input string must be non-empty');
      expect(() => toValidIndexName('-')).toThrow('No valid characters in input string');
    });

    it('should throw on input with only forbidden characters', () => {
      expect(() => toValidIndexName('*/?"<>|,#:')).toThrow('No valid characters in input string');
    });
  });
});
