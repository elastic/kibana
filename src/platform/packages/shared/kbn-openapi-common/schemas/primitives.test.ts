/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { NonEmptyString } from './primitives.gen';

describe('NonEmptyString', () => {
  describe('accepts ', () => {
    // \t\r\n\f
    test('accepts newline chars', () => {
      expect(() => NonEmptyString.parse('hello \nworld')).not.toThrow();
    });
    test('accepts tab chars', () => {
      expect(() => NonEmptyString.parse('hello \tworld')).not.toThrow();
    });
    test('accepts carriage return chars', () => {
      expect(() => NonEmptyString.parse('hello \rworld')).not.toThrow();
    });
    test('accepts form feed return chars', () => {
      expect(() => NonEmptyString.parse('hello \fworld')).not.toThrow();
    });
  });
  describe('rejects', () => {
    test('rejects only tab chars chars', () => {
      expect(() => NonEmptyString.parse('\t\t\t\t')).toThrow();
    });
    test('rejects only newline chars chars', () => {
      expect(() => NonEmptyString.parse('\n\n\n\n\n')).toThrow();
    });
    test('rejects only carriage return chars chars', () => {
      expect(() => NonEmptyString.parse('\r\r\r\r')).toThrow();
    });
    test('rejects only form feed chars chars', () => {
      expect(() => NonEmptyString.parse('\f\f\f\f\f')).toThrow();
    });
    test('rejects comment with just spaces', () => {
      expect(() => NonEmptyString.parse('    ')).toThrow();
    });
  });
});
