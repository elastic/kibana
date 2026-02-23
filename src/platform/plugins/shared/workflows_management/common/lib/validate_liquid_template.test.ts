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
  });
});
