/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { removeLastPipe, processPipes, toSingleLine, removeComments } from './query_string_utils';

describe('query_string_utils', () => {
  describe('removeComments', () => {
    it('should remove single-line comments', () => {
      const text = `
        FROM users // This is a comment
        | WHERE age > 18
      `;
      const expected = `FROM users         | WHERE age > 18`;
      expect(removeComments(text)).toBe(expected);
    });

    it('should remove multi-line comments', () => {
      const text = `
        FROM /* This is a
        multi-line
        comment */
        products
      `;
      const expected = `FROM 
        products`;
      expect(removeComments(text)).toBe(expected);
    });

    it('should remove both single-line and multi-line comments', () => {
      const text = `
        FROM items // Get the name
        /* The price of the
        product */
        | KEEP name, price
      `;
      const expected = `FROM items         
        | KEEP name, price`;
      expect(removeComments(text)).toBe(expected);
    });

    it('should handle text with no comments', () => {
      const text = `
        FROM orders
        | KEEP order_id, status
        | WHERE status = 'pending';
      `;
      expect(removeComments(text)).toBe(text.trim());
    });

    it('should handle comments at the beginning and end of the text', () => {
      const text = `
        // Initial comment
        FROM logs
        /* Final
        comment */
      `;
      const expected = `FROM logs`;
      expect(removeComments(text)).toBe(expected);
    });

    it('should handle consecutive single-line comments', () => {
      const text = `
        // Comment line 1
        // Comment line 2
        FROM events | STATS COUNT(*)
      `;
      const expected = `
        FROM events | STATS COUNT(*)
      `;
      expect(removeComments(text)).toBe(expected.trim());
    });
  });

  describe('removeLastPipe', () => {
    it('should remove the last pipe and any trailing whitespace', () => {
      expect(removeLastPipe('value1|value2|')).toBe('value1|value2');
      expect(removeLastPipe('value1|value2|  ')).toBe('value1|value2');
    });

    it('should return the original string if there is no pipe', () => {
      expect(removeLastPipe('FROM index')).toBe('FROM index');
      expect(removeLastPipe('FROM index  ')).toBe('FROM index');
    });

    it('should handle strings with multiple pipes correctly', () => {
      expect(removeLastPipe('FROM index | STATS count() | DROP field1  ')).toBe(
        'FROM index | STATS count()'
      );
    });

    it('should handle an empty string', () => {
      expect(removeLastPipe('')).toBe('');
    });

    it('should handle a string with only whitespace', () => {
      expect(removeLastPipe('  ')).toBe('');
    });
  });

  describe('processPipes', () => {
    it('should return an array of strings, each progressively including parts separated by " | "', () => {
      const input = 'FROM index|EVAL col = ABS(numeric) | KEEP col';
      const expected = [
        'FROM index',
        'FROM index | EVAL col = ABS(numeric)',
        'FROM index | EVAL col = ABS(numeric) | KEEP col',
      ];
      expect(processPipes(input)).toEqual(expected);
    });

    it('should handle leading and trailing whitespace in parts', () => {
      const input = ' FROM index |  EVAL col = ABS(numeric)  | KEEP col ';
      const expected = [
        'FROM index',
        'FROM index | EVAL col = ABS(numeric)',
        'FROM index | EVAL col = ABS(numeric) | KEEP col',
      ];
      expect(processPipes(input)).toEqual(expected);
    });

    it('should return an array with the trimmed input if there are no pipes', () => {
      const input = 'FROM index';
      const expected = ['FROM index'];
      expect(processPipes(input)).toEqual(expected);

      const inputWithWhitespace = '  FROM index  ';
      const expectedWithWhitespace = ['FROM index'];
      expect(processPipes(inputWithWhitespace)).toEqual(expectedWithWhitespace);
    });

    it('should ignore comments', () => {
      const input = '// This is an ES|QL query \n FROM index';
      const expected = ['FROM index'];
      expect(processPipes(input)).toEqual(expected);
    });
  });

  describe('toSingleLine', () => {
    it('should convert a multi-line pipe-separated string to a single line with " | " as separator', () => {
      const input = 'FROM index \n|EVAL col = ABS(numeric)\n|KEEP col';
      const expected = 'FROM index | EVAL col = ABS(numeric) | KEEP col';
      expect(toSingleLine(input)).toBe(expected);
    });

    it('should trim whitespace from each part', () => {
      const input = ' FROM index |  EVAL col = ABS(numeric)  | KEEP col ';
      const expected = 'FROM index | EVAL col = ABS(numeric) | KEEP col';
      expect(toSingleLine(input)).toBe(expected);
    });

    it('should trim whitespace from each part for multi-line strings', () => {
      const input = ' FROM index \n|  EVAL col = ABS(numeric)  \n| KEEP col ';
      const expected = 'FROM index | EVAL col = ABS(numeric) | KEEP col';
      expect(toSingleLine(input)).toBe(expected);
    });

    it('should ignore comments', () => {
      const input = '// This is an ES|QL query \n FROM index';
      const expected = 'FROM index';
      expect(toSingleLine(input)).toEqual(expected);
    });
  });
});
