/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractLiquidErrorPosition } from './extract_liquid_error_position';

describe('extractLiquidErrorPosition', () => {
  describe('specific error token detection', () => {
    it('should find undefined filter errors', () => {
      const text = 'Hello {{ name | unknownFilter }} world';
      const errorMessage = 'undefined filter: unknownFilter';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result).toEqual({
        start: text.indexOf('unknownFilter'),
        end: text.indexOf('unknownFilter') + 'unknownFilter'.length,
      });
    });

    it('should find undefined tag errors', () => {
      const text = 'Hello {% unknownTag %} world';
      const errorMessage = "tag 'unknownTag' not found";

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result).toEqual({
        start: text.indexOf('unknownTag'),
        end: text.indexOf('unknownTag') + 'unknownTag'.length,
      });
    });

    it('should find unclosed output expressions', () => {
      const text = 'Hello {{ unclosed world';
      const errorMessage = "output '{{ unclosed' not closed";

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result).toEqual({
        start: text.indexOf('{{ unclosed'),
        end: Math.min(text.indexOf('{{ unclosed') + '{{ unclosed'.length + 10, text.length),
      });
    });

    it('should find unclosed tag expressions', () => {
      const text = 'Hello {% unclosed world';
      const errorMessage = "tag '{% unclosed' not closed";

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result).toEqual({
        start: text.indexOf('{% unclosed'),
        end: Math.min(text.indexOf('{% unclosed') + '{% unclosed'.length + 10, text.length),
      });
    });

    it('should handle multiple occurrences of the same filter', () => {
      const text = 'First {{ name | unknownFilter }} and second {{ other | unknownFilter }}';
      const errorMessage = 'undefined filter: unknownFilter';

      const result = extractLiquidErrorPosition(text, errorMessage);

      // Should find the first occurrence
      expect(result.start).toBe(text.indexOf('unknownFilter'));
      expect(result.end).toBe(text.indexOf('unknownFilter') + 'unknownFilter'.length);
    });
  });

  describe('line/column error parsing', () => {
    it('should parse line and column from error message', () => {
      const text = 'Line 1\nLine 2\nLine 3 with {{ error }} here';
      const errorMessage = 'some error, line:3, col:15';

      const result = extractLiquidErrorPosition(text, errorMessage);

      // Line 3, column 15 should point to the 'e' in 'error'
      const expectedStart = text.indexOf('{{ error }}');
      expect(result.start).toBe(expectedStart);
      expect(result.end).toBeGreaterThan(result.start);
    });

    it('should handle single line text with column offset', () => {
      const text = 'Hello {{ world }}';
      const errorMessage = 'error, line:1, col:8';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result.start).toBe(7); // Position of 'w' in 'world'
      expect(result.end).toBeGreaterThan(result.start);
    });

    it('should extend position to include full liquid expression', () => {
      const text = 'Hello {{ myVariable | filter }} world';
      const errorMessage = 'error, line:1, col:8';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result.start).toBe(7); // Start of '{{'
      expect(result.end).toBe(text.indexOf('}}') + 2); // End of '}}'
    });

    it('should handle liquid tag expressions', () => {
      const text = 'Hello {% if condition %} world';
      const errorMessage = 'error, line:1, col:8';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result.start).toBe(7); // Start of '{%'
      expect(result.end).toBe(text.indexOf('%}') + 2); // End of '%}'
    });

    it('should handle expressions without closing tags', () => {
      const text = 'Hello {{ unclosed expression';
      const errorMessage = 'error, line:1, col:8';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result.start).toBe(7);
      expect(result.end).toBe(Math.min(7 + 50, text.length)); // Limited to 50 chars
    });

    it('should handle word boundaries when no liquid syntax', () => {
      const text = 'Hello world error here';
      const errorMessage = 'error, line:1, col:12';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result.start).toBe(11); // Start of 'error'
      expect(result.end).toBe(16); // End of 'error'
    });
  });

  describe('fallback scenarios', () => {
    it('should find liquid patterns when no specific error info', () => {
      const text = 'Hello {{ variable }} world';
      const errorMessage = 'some generic error';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result.start).toBe(text.indexOf('{{'));
      expect(result.end).toBe(text.indexOf('}}') + 2);
    });

    it('should find liquid tag patterns', () => {
      const text = 'Hello {% tag %} world';
      const errorMessage = 'some generic error';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result.start).toBe(text.indexOf('{%'));
      expect(result.end).toBe(text.indexOf('%}') + 2);
    });

    it('should handle multiple liquid patterns and return first one', () => {
      const text = 'First {{ var1 }} and second {{ var2 }}';
      const errorMessage = 'some generic error';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result.start).toBe(text.indexOf('{{ var1 }}'));
      expect(result.end).toBe(text.indexOf('{{ var1 }}') + '{{ var1 }}'.length);
    });

    it('should handle unclosed liquid patterns', () => {
      const text = 'Hello {{ unclosed world';
      const errorMessage = 'some generic error';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result.start).toBe(text.indexOf('{{'));
      expect(result.end).toBe(Math.min(text.indexOf('{{') + 20, text.length));
    });
  });

  describe('final fallback', () => {
    it('should return first character when no patterns found', () => {
      const text = 'Hello world';
      const errorMessage = 'some error';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result).toEqual({ start: 0, end: 1 });
    });

    it('should handle empty text', () => {
      const text = '';
      const errorMessage = 'some error';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result).toEqual({ start: 0, end: 0 });
    });
  });

  describe('edge cases', () => {
    it('should handle malformed line/column format', () => {
      const text = 'Hello {{ world }}';
      const errorMessage = 'error, line:abc, col:def';

      const result = extractLiquidErrorPosition(text, errorMessage);

      // Should fall back to liquid pattern matching
      expect(result.start).toBe(text.indexOf('{{'));
      expect(result.end).toBe(text.indexOf('}}') + 2);
    });

    it('should handle line numbers beyond text length', () => {
      const text = 'Single line';
      const errorMessage = 'error, line:10, col:5';

      const result = extractLiquidErrorPosition(text, errorMessage);

      // Should fall back to liquid pattern matching
      expect(result.start).toBe(0);
      expect(result.end).toBe(1);
    });

    it('should handle negative column numbers', () => {
      const text = 'Hello {{ world }}';
      const errorMessage = 'error, line:1, col:-5';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result.start).toBe(0); // Math.max(0, -5 + 1) = 0
      expect(result.end).toBeGreaterThan(result.start);
    });

    it('should handle very long text', () => {
      const longText = 'a'.repeat(1000) + '{{ error }}' + 'b'.repeat(1000);
      const errorMessage = 'undefined filter: error';

      const result = extractLiquidErrorPosition(longText, errorMessage);

      expect(result.start).toBe(longText.indexOf('error'));
      expect(result.end).toBe(longText.indexOf('error') + 'error'.length);
    });

    it('should handle text with no liquid syntax', () => {
      const text = 'Just plain text with no liquid syntax';
      const errorMessage = 'some error';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result).toEqual({ start: 0, end: 1 });
    });

    it('should handle error messages with special characters', () => {
      const text = 'Hello {{ name | filter }} world';
      const errorMessage = 'undefined filter: filter-with-dashes';

      const result = extractLiquidErrorPosition(text, errorMessage);

      // Should fall back since the filter name doesn't match
      expect(result.start).toBe(text.indexOf('{{'));
      expect(result.end).toBe(text.indexOf('}}') + 2);
    });

    it('should handle case sensitivity in filter names', () => {
      const text = 'Hello {{ name | MyFilter }} world';
      const errorMessage = 'undefined filter: myfilter';

      const result = extractLiquidErrorPosition(text, errorMessage);

      // Should fall back since case doesn't match
      expect(result.start).toBe(text.indexOf('{{'));
      expect(result.end).toBe(text.indexOf('}}') + 2);
    });

    it('should handle whitespace in filter names', () => {
      const text = 'Hello {{ name | spaced filter }} world';
      const errorMessage = 'undefined filter: spaced filter';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result.start).toBe(text.indexOf('spaced filter'));
      expect(result.end).toBe(text.indexOf('spaced filter') + 'spaced filter'.length);
    });
  });

  describe('boundary conditions', () => {
    it('should handle start position at text beginning', () => {
      const text = '{{ error }} at start';
      const errorMessage = 'undefined filter: error';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result.start).toBe(3); // Position of 'error'
      expect(result.end).toBe(8); // End of 'error'
    });

    it('should handle end position at text end', () => {
      const text = 'at end {{ error }}';
      const errorMessage = 'undefined filter: error';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result.start).toBe(text.indexOf('error'));
      expect(result.end).toBe(text.indexOf('error') + 'error'.length);
    });

    it('should not exceed text boundaries', () => {
      const text = 'short';
      const errorMessage = 'error, line:1, col:10';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result.start).toBeGreaterThanOrEqual(0);
      expect(result.end).toBeLessThanOrEqual(text.length);
    });

    it('should handle single character text', () => {
      const text = 'a';
      const errorMessage = 'some error';

      const result = extractLiquidErrorPosition(text, errorMessage);

      expect(result).toEqual({ start: 0, end: 1 });
    });
  });
});
