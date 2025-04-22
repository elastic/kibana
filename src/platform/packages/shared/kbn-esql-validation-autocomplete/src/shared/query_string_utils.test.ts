/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { removeLastPipe, processPipes, toSingleLine } from './query_string_utils';

describe('query_string_utils', () => {
  describe('removeLastPipe', () => {
    it('should remove the last pipe and any trailing whitespace', () => {
      expect(removeLastPipe('value1|value2|')).toBe('value1|value2');
      expect(removeLastPipe('value1|value2|  ')).toBe('value1|value2');
    });

    it('should return the original string if there is no pipe', () => {
      expect(removeLastPipe('value1value2')).toBe('value1value2');
      expect(removeLastPipe('value1value2  ')).toBe('value1value2');
    });

    it('should handle strings with multiple pipes correctly', () => {
      expect(removeLastPipe('a|b|c|d')).toBe('a|b|c');
      expect(removeLastPipe('from index | stats count() | drop field1  ')).toBe(
        'from index | stats count()'
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
      const input = 'value1|value2|value3';
      const expected = ['value1', 'value1 | value2', 'value1 | value2 | value3'];
      expect(processPipes(input)).toEqual(expected);
    });

    it('should handle leading and trailing whitespace in parts', () => {
      const input = ' valueA |  valueB  | valueC ';
      const expected = ['valueA', 'valueA | valueB', 'valueA | valueB | valueC'];
      expect(processPipes(input)).toEqual(expected);
    });

    it('should return an array with the trimmed input if there are no pipes', () => {
      const input = 'from index';
      const expected = ['from index'];
      expect(processPipes(input)).toEqual(expected);

      const inputWithWhitespace = '  from index  ';
      const expectedWithWhitespace = ['from index'];
      expect(processPipes(inputWithWhitespace)).toEqual(expectedWithWhitespace);
    });
  });

  describe('toSingleLine', () => {
    it('should convert a multi-line pipe-separated string to a single line with " | " as separator', () => {
      const input = 'value1 \n|value2\n|value3';
      const expected = 'value1 | value2 | value3';
      expect(toSingleLine(input)).toBe(expected);
    });

    it('should trim whitespace from each part', () => {
      const input = ' valueA |  valueB  | valueC ';
      const expected = 'valueA | valueB | valueC';
      expect(toSingleLine(input)).toBe(expected);
    });

    it('should trim whitespace from each part for multi-line strings', () => {
      const input = ' valueA \n|  valueB  \n| valueC ';
      const expected = 'valueA | valueB | valueC';
      expect(toSingleLine(input)).toBe(expected);
    });

    it('should handle parts with internal whitespace (which should be preserved)', () => {
      const input = 'part with spaces|another part|yet another';
      const expected = 'part with spaces | another part | yet another';
      expect(toSingleLine(input)).toBe(expected);
    });
  });
});
