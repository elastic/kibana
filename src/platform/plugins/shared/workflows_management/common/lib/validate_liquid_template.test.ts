/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateLiquidTemplate } from './validate_liquid_template';

describe('validateLiquidTemplate (common)', () => {
  describe('valid templates', () => {
    it('should return empty array for valid liquid template', () => {
      expect(validateLiquidTemplate('Hello {{ name }} world')).toEqual([]);
    });

    it('should return empty array for template with filters', () => {
      expect(validateLiquidTemplate('Hello {{ name | capitalize }} world')).toEqual([]);
    });

    it('should return empty array for template with tags', () => {
      expect(validateLiquidTemplate('Hello {% if condition %}world{% endif %}')).toEqual([]);
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
      expect(validateLiquidTemplate(yamlString)).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(validateLiquidTemplate('')).toEqual([]);
    });

    it('should return empty array for plain text', () => {
      expect(validateLiquidTemplate('Just plain text without any liquid syntax')).toEqual([]);
    });
  });

  describe('invalid templates', () => {
    it('should return errors for undefined filter', () => {
      const result = validateLiquidTemplate('Hello {{ name | unknownFilter }} world');
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('unknownFilter');
      expect(result[0].startLine).toBeGreaterThan(0);
      expect(result[0].startColumn).toBeGreaterThan(0);
    });

    it('should return errors for unclosed output', () => {
      const result = validateLiquidTemplate('Hello {{ unclosed world');
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('not closed');
    });

    it('should return errors for unclosed tag expressions', () => {
      const result = validateLiquidTemplate('Hello {% unclosed world');
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('not closed');
    });

    it('should return errors for unknown tag', () => {
      const result = validateLiquidTemplate('Hello {% unknownTag %} world');
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('unknownTag');
    });

    it('should not return errors for single-brace text', () => {
      expect(validateLiquidTemplate('Hello { not liquid } world')).toEqual([]);
    });
  });

  describe('error format', () => {
    it('should return LiquidValidationError with all required fields', () => {
      const result = validateLiquidTemplate('{{ name | unknownFilter }}');
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('message');
      expect(result[0]).toHaveProperty('startLine');
      expect(result[0]).toHaveProperty('startColumn');
      expect(result[0]).toHaveProperty('endLine');
      expect(result[0]).toHaveProperty('endColumn');
    });

    it('should remove line and column numbers from customer-facing messages', () => {
      const result = validateLiquidTemplate('Hello {{ name | unknownFilter }} world');
      expect(result).toHaveLength(1);
      expect(result[0].message).not.toContain('line:');
      expect(result[0].message).not.toContain('col:');
    });
  });

  describe('position conversion', () => {
    it('should convert offset to line/column correctly for single line', () => {
      const result = validateLiquidTemplate('Hello {{ name | unknownFilter }} world');
      expect(result).toHaveLength(1);
      expect(result[0].startLine).toBe(1);
      expect(result[0].startColumn).toBeGreaterThan(1);
      expect(result[0].endLine).toBe(1);
      expect(result[0].endColumn).toBeGreaterThan(result[0].startColumn);
    });

    it('should convert offset to line/column correctly for multi-line', () => {
      const yamlString = `Line 1
Line 2 with {{ error | unknownFilter }} here
Line 3`;

      const result = validateLiquidTemplate(yamlString);

      expect(result).toHaveLength(1);
      expect(result[0].startLine).toBe(2);
      expect(result[0].endLine).toBe(2);
    });

    it('should handle position at the beginning of text', () => {
      const result = validateLiquidTemplate('{{ name | unknownFilter }} at start');
      expect(result).toHaveLength(1);
      expect(result[0].startLine).toBe(1);
    });

    it('should handle position at the end of text', () => {
      const result = validateLiquidTemplate('at end {{ name | unknownFilter }}');
      expect(result).toHaveLength(1);
      expect(result[0].startLine).toBe(1);
      expect(result[0].startColumn).toBeGreaterThan(1);
    });
  });
});
