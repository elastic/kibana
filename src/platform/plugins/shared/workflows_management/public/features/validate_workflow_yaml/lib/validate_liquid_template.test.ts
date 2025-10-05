/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateLiquidTemplate } from './validate_liquid_template';

// Mock the extractLiquidErrorPosition function
jest.mock('./extract_liquid_error_position', () => ({
  extractLiquidErrorPosition: jest.fn(),
}));

import { extractLiquidErrorPosition } from './extract_liquid_error_position';

const mockExtractLiquidErrorPosition = extractLiquidErrorPosition as jest.MockedFunction<
  typeof extractLiquidErrorPosition
>;

describe('validateLiquidTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('valid templates', () => {
    it('should return empty array for valid liquid template', () => {
      const yamlString = 'Hello {{ name }} world';
      const result = validateLiquidTemplate(yamlString);
      expect(result).toEqual([]);
    });

    it('should return empty array for template with filters', () => {
      const yamlString = 'Hello {{ name | capitalize }} world';
      const result = validateLiquidTemplate(yamlString);
      expect(result).toEqual([]);
    });

    it('should return empty array for template with tags', () => {
      const yamlString = 'Hello {% if condition %}world{% endif %}';
      const result = validateLiquidTemplate(yamlString);
      expect(result).toEqual([]);
    });

    it('should return empty array for complex valid template', () => {
      const yamlString = `
        Hello {{ user.name | capitalize }}
        {% if user.isActive %}
          Welcome back!
        {% else %}
          Please activate your account
        {% endif %}
        {% for item in items %}
          - {{ item.title }}
        {% endfor %}
      `;
      const result = validateLiquidTemplate(yamlString);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const yamlString = '';
      const result = validateLiquidTemplate(yamlString);
      expect(result).toEqual([]);
    });

    it('should return empty array for plain text without liquid syntax', () => {
      const yamlString = 'Just plain text without any liquid syntax';
      const result = validateLiquidTemplate(yamlString);
      expect(result).toEqual([]);
    });
  });

  describe('syntax errors', () => {
    it('should handle undefined filter errors', () => {
      const yamlString = 'Hello {{ name | unknownFilter }} world';

      mockExtractLiquidErrorPosition.mockReturnValue({
        start: 15,
        end: 27,
      });

      const result = validateLiquidTemplate(yamlString);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'liquid-template-1-16-1-28',
        source: 'liquid-template-validation',
        message: 'undefined filter: unknownFilter',
        startLineNumber: 1,
        startColumn: 16,
        endLineNumber: 1,
        endColumn: 28,
        severity: 'error',
        hoverMessage: 'undefined filter: unknownFilter',
      });
    });

    it('should handle undefined tag errors', () => {
      const yamlString = 'Hello {% unknownTag %} world';

      mockExtractLiquidErrorPosition.mockReturnValue({
        start: 8,
        end: 20,
      });

      const result = validateLiquidTemplate(yamlString);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'liquid-template-1-9-1-21',
        source: 'liquid-template-validation',
        message: "tag 'unknownTag' not found",
        startLineNumber: 1,
        startColumn: 9,
        endLineNumber: 1,
        endColumn: 21,
        severity: 'error',
        hoverMessage: "tag 'unknownTag' not found",
      });
    });

    it('should handle unclosed output expressions', () => {
      const yamlString = 'Hello {{ unclosed world';

      mockExtractLiquidErrorPosition.mockReturnValue({
        start: 8,
        end: 25,
      });

      const result = validateLiquidTemplate(yamlString);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'liquid-template-1-9-1-26',
        source: 'liquid-template-validation',
        message: "output '{{ unclosed' not closed",
        startLineNumber: 1,
        startColumn: 9,
        endLineNumber: 1,
        endColumn: 26,
        severity: 'error',
        hoverMessage: "output '{{ unclosed' not closed",
      });
    });

    it('should handle unclosed tag expressions', () => {
      const yamlString = 'Hello {% unclosed world';

      mockExtractLiquidErrorPosition.mockReturnValue({
        start: 8,
        end: 25,
      });

      const result = validateLiquidTemplate(yamlString);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'liquid-template-1-9-1-26',
        source: 'liquid-template-validation',
        message: "tag '{% unclosed' not closed",
        startLineNumber: 1,
        startColumn: 9,
        endLineNumber: 1,
        endColumn: 26,
        severity: 'error',
        hoverMessage: "tag '{% unclosed' not closed",
      });
    });

    it('should handle malformed liquid syntax', () => {
      const yamlString = 'Hello { invalid syntax } world';

      mockExtractLiquidErrorPosition.mockReturnValue({
        start: 8,
        end: 25,
      });

      const result = validateLiquidTemplate(yamlString);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'liquid-template-1-9-1-26',
        source: 'liquid-template-validation',
        message: 'Invalid liquid syntax',
        startLineNumber: 1,
        startColumn: 9,
        endLineNumber: 1,
        endColumn: 26,
        severity: 'error',
        hoverMessage: 'Invalid liquid syntax',
      });
    });
  });

  describe('error message formatting', () => {
    it('should remove line and column numbers from customer-facing messages', () => {
      const yamlString = 'Hello {{ name | unknownFilter }} world';

      mockExtractLiquidErrorPosition.mockReturnValue({
        start: 15,
        end: 27,
      });

      const result = validateLiquidTemplate(yamlString);

      expect(result[0].message).toBe('undefined filter: unknownFilter');
      expect(result[0].hoverMessage).toBe('undefined filter: unknownFilter');
      expect(result[0].message).not.toContain('line:');
      expect(result[0].message).not.toContain('col:');
    });
  });

  describe('position conversion', () => {
    it('should convert offset to line/column correctly for single line', () => {
      const yamlString = 'Hello {{ world }}';

      mockExtractLiquidErrorPosition.mockReturnValue({
        start: 7, // Position of 'w' in 'world'
        end: 12, // End of 'world'
      });

      const result = validateLiquidTemplate(yamlString);

      expect(result[0].startLineNumber).toBe(1);
      expect(result[0].startColumn).toBe(8);
      expect(result[0].endLineNumber).toBe(1);
      expect(result[0].endColumn).toBe(13);
    });

    it('should convert offset to line/column correctly for multi-line', () => {
      const yamlString = `Line 1
Line 2 with {{ error }} here
Line 3`;

      mockExtractLiquidErrorPosition.mockReturnValue({
        start: 20, // Position of 'error' in the full string
        end: 25,
      });

      const result = validateLiquidTemplate(yamlString);

      expect(result[0].startLineNumber).toBe(2);
      expect(result[0].startColumn).toBe(16);
      expect(result[0].endLineNumber).toBe(2);
      expect(result[0].endColumn).toBe(21);
    });

    it('should handle position at the beginning of text', () => {
      const yamlString = '{{ error }} at start';

      mockExtractLiquidErrorPosition.mockReturnValue({
        start: 0,
        end: 5,
      });

      const result = validateLiquidTemplate(yamlString);

      expect(result[0].startLineNumber).toBe(1);
      expect(result[0].startColumn).toBe(1);
      expect(result[0].endLineNumber).toBe(1);
      expect(result[0].endColumn).toBe(6);
    });

    it('should handle position at the end of text', () => {
      const yamlString = 'at end {{ error }}';

      mockExtractLiquidErrorPosition.mockReturnValue({
        start: 8,
        end: 13,
      });

      const result = validateLiquidTemplate(yamlString);

      expect(result[0].startLineNumber).toBe(1);
      expect(result[0].startColumn).toBe(9);
      expect(result[0].endLineNumber).toBe(1);
      expect(result[0].endColumn).toBe(14);
    });
  });

  describe('integration with extractLiquidErrorPosition', () => {
    it('should call extractLiquidErrorPosition with correct parameters', () => {
      const yamlString = 'Hello {{ name | unknownFilter }} world';
      const errorMessage = 'undefined filter: unknownFilter, line:1, col:15';

      mockExtractLiquidErrorPosition.mockReturnValue({
        start: 15,
        end: 27,
      });

      validateLiquidTemplate(yamlString);

      expect(mockExtractLiquidErrorPosition).toHaveBeenCalledWith(yamlString, errorMessage);
    });

    it('should handle extractLiquidErrorPosition returning zero positions', () => {
      const yamlString = 'Hello {{ name | unknownFilter }} world';

      mockExtractLiquidErrorPosition.mockReturnValue({
        start: 0,
        end: 0,
      });

      const result = validateLiquidTemplate(yamlString);

      expect(result[0].startLineNumber).toBe(1);
      expect(result[0].startColumn).toBe(1);
      expect(result[0].endLineNumber).toBe(1);
      expect(result[0].endColumn).toBe(1);
    });
  });
});
