/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  containsWhitespace,
  endsWithAssignment,
  endsWithComma,
  endsWithNonWhitespace,
  endsWithOpenParen,
  endsWithWhitespace,
  escapeRegExp,
  ESQL_IDENTIFIER_PATTERN,
  findFirstNonWhitespaceIndex,
  getTrailingIdentifier,
  isOnlyWhitespace,
  normalizeWhitespace,
  startsWithWordChar,
} from './regex';

describe('regex utilities', () => {
  describe('shared patterns', () => {
    it('matches ES|QL identifiers', () => {
      const identifierRegex = new RegExp(`^${ESQL_IDENTIFIER_PATTERN}$`);

      expect(identifierRegex.test('field')).toBe(true);
      expect(identifierRegex.test('_field1')).toBe(true);
      expect(identifierRegex.test('1field')).toBe(false);
      expect(identifierRegex.test('field.name')).toBe(false);
    });

    it('can be used to build identifier expressions', () => {
      const trailingIdentifierRegex = new RegExp(`(${ESQL_IDENTIFIER_PATTERN})\\s*$`);

      expect('end=value start'.match(trailingIdentifierRegex)?.[1]).toBe('start');
    });
  });

  describe('predicates', () => {
    it('detects trailing commas', () => {
      expect(endsWithComma('field,')).toBe(true);
      expect(endsWithComma('field,   ')).toBe(true);
      expect(endsWithComma('field')).toBe(false);
    });

    it('detects trailing assignments', () => {
      expect(endsWithAssignment('col =')).toBe(true);
      expect(endsWithAssignment('col =  ')).toBe(true);
      expect(endsWithAssignment('col = field')).toBe(false);
    });

    it('detects trailing whitespace', () => {
      expect(endsWithWhitespace('field ')).toBe(true);
      expect(endsWithWhitespace('field\n')).toBe(true);
      expect(endsWithWhitespace('field')).toBe(false);
      expect(endsWithWhitespace('')).toBe(false);
    });

    it('detects trailing non-whitespace', () => {
      expect(endsWithNonWhitespace('field')).toBe(true);
      expect(endsWithNonWhitespace('field ')).toBe(false);
      expect(endsWithNonWhitespace('')).toBe(false);
    });

    it('detects any whitespace', () => {
      expect(containsWhitespace('field name')).toBe(true);
      expect(containsWhitespace('field\tname')).toBe(true);
      expect(containsWhitespace('field')).toBe(false);
    });

    it('detects strings that are only whitespace', () => {
      expect(isOnlyWhitespace(' ')).toBe(true);
      expect(isOnlyWhitespace('\t\n')).toBe(true);
      expect(isOnlyWhitespace(' field ')).toBe(false);
      expect(isOnlyWhitespace('')).toBe(false);
    });

    it('detects strings that start with a word character', () => {
      expect(startsWithWordChar('field')).toBe(true);
      expect(startsWithWordChar('_field')).toBe(true);
      expect(startsWithWordChar('1field')).toBe(true);
      expect(startsWithWordChar('`field`')).toBe(false);
      expect(startsWithWordChar('')).toBe(false);
    });

    it('detects trailing open parenthesis with optional whitespace', () => {
      expect(endsWithOpenParen('fn(')).toBe(true);
      expect(endsWithOpenParen('fn(  ')).toBe(true);
      expect(endsWithOpenParen('fn()')).toBe(false);
    });
  });

  describe('helpers', () => {
    it('escapes strings for use inside RegExp', () => {
      const text = 'field.name[0]*';
      const escaped = escapeRegExp(text);

      expect(new RegExp(`^${escaped}$`).test(text)).toBe(true);
      expect(new RegExp(`^${escaped}$`).test('fieldXname[0]*')).toBe(false);
    });

    it('extracts trailing identifiers', () => {
      expect(getTrailingIdentifier('end=value start')).toBe('start');
      expect(getTrailingIdentifier('step ')).toBe('step');
      expect(getTrailingIdentifier('field.name')).toBe('name');
      expect(getTrailingIdentifier('123')).toBeUndefined();
    });

    it('finds the first non-whitespace character', () => {
      expect(findFirstNonWhitespaceIndex('  field')).toBe(2);
      expect(findFirstNonWhitespaceIndex('\t\nfield')).toBe(2);
      expect(findFirstNonWhitespaceIndex('   ')).toBe(-1);
      expect(findFirstNonWhitespaceIndex('')).toBe(-1);
    });

    it('normalizes whitespace runs to a single space', () => {
      expect(normalizeWhitespace('field\t\nname   value ')).toBe('field name value ');
      expect(normalizeWhitespace('   ')).toBe(' ');
      expect(normalizeWhitespace('field')).toBe('field');
    });
  });
});
