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
    it('should return empty array for valid liquid template in YAML value', () => {
      expect(validateLiquidTemplate('key: "Hello {{ name }} world"')).toEqual([]);
    });

    it('should return empty array for template with filters', () => {
      expect(validateLiquidTemplate('key: "Hello {{ name | capitalize }} world"')).toEqual([]);
    });

    it('should return empty array for template with tags', () => {
      expect(
        validateLiquidTemplate('key: "Hello {% if condition %}world{% endif %}"')
      ).toEqual([]);
    });

    it('should return empty array for complex valid template', () => {
      const yamlString = [
        'greeting: "Hello {{ user.name | capitalize }}"',
        'welcome: "{% if user.isActive %}Welcome back!{% else %}Please activate{% endif %}"',
        'items: "{% for item in items %}{{ item.title }}{% endfor %}"',
      ].join('\n');
      expect(validateLiquidTemplate(yamlString)).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(validateLiquidTemplate('')).toEqual([]);
    });

    it('should return empty array for plain text YAML', () => {
      expect(validateLiquidTemplate('key: Just plain text without any liquid syntax')).toEqual(
        []
      );
    });

    it('should not return false positives for YAML line-folded template expressions', () => {
      const yamlWithFoldedTemplate = [
        'name: Test Workflow',
        'steps:',
        '  - name: step1',
        '    type: data.set',
        '    with:',
        '      content: "${{steps.extract_content.output.docs[0].doc._source.attachment.conten\\',
        '        t}}"',
      ].join('\n');

      expect(validateLiquidTemplate(yamlWithFoldedTemplate)).toEqual([]);
    });
  });

  describe('invalid templates', () => {
    it('should return errors for undefined filter', () => {
      const result = validateLiquidTemplate('key: "Hello {{ name | unknownFilter }} world"');
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('unknownFilter');
    });

    it('should return errors for unclosed output', () => {
      const result = validateLiquidTemplate('key: "Hello {{ unclosed world"');
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('not closed');
    });

    it('should return errors for unclosed tag expressions', () => {
      const result = validateLiquidTemplate('key: "Hello {% unclosed world"');
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('not closed');
    });

    it('should return errors for unknown tag', () => {
      const result = validateLiquidTemplate('key: "Hello {% unknownTag %} world"');
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('unknownTag');
    });

    it('should return multiple errors for multiple invalid values', () => {
      const yaml = [
        'a: "{{ name | unknownFilter }}"',
        'b: "{{ other | anotherBadFilter }}"',
      ].join('\n');
      const result = validateLiquidTemplate(yaml);
      expect(result).toHaveLength(2);
    });

    it('should not flag strings without liquid syntax', () => {
      expect(validateLiquidTemplate('key: "Hello { not liquid } world"')).toEqual([]);
    });
  });

  describe('error format', () => {
    it('should return LiquidValidationError with all required fields', () => {
      const result = validateLiquidTemplate('key: "{{ name | unknownFilter }}"');
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('message');
      expect(result[0]).toHaveProperty('startLine');
      expect(result[0]).toHaveProperty('startColumn');
      expect(result[0]).toHaveProperty('endLine');
      expect(result[0]).toHaveProperty('endColumn');
    });

    it('should remove line and column numbers from customer-facing messages', () => {
      const result = validateLiquidTemplate('key: "Hello {{ name | unknownFilter }} world"');
      expect(result).toHaveLength(1);
      expect(result[0].message).not.toContain('line:');
      expect(result[0].message).not.toContain('col:');
    });
  });

  describe('position mapping', () => {
    it('should point to the node on the correct line for single-line YAML', () => {
      const result = validateLiquidTemplate('key: "{{ name | unknownFilter }}"');
      expect(result).toHaveLength(1);
      expect(result[0].startLine).toBe(1);
      expect(result[0].endLine).toBe(1);
    });

    it('should point to the node on the correct line for multi-line YAML', () => {
      const yamlString = [
        'line1: ok',
        'line2: "{{ error | unknownFilter }}"',
        'line3: also ok',
      ].join('\n');

      const result = validateLiquidTemplate(yamlString);

      expect(result).toHaveLength(1);
      expect(result[0].startLine).toBe(2);
      expect(result[0].endLine).toBe(2);
    });
  });

  describe('sub-token positioning', () => {
    it('should pinpoint undefined filter name', () => {
      const yaml = 'key: "Hello {{ name | unknownFilter }} world"';
      const result = validateLiquidTemplate(yaml);
      expect(result).toHaveLength(1);
      // Should highlight just "unknownFilter", not the whole value
      const filterStart = yaml.indexOf('unknownFilter');
      expect(result[0].startColumn).toBe(filterStart + 1); // 1-based
      expect(result[0].endColumn).toBe(filterStart + 'unknownFilter'.length + 1);
    });

    it('should pinpoint unknown tag name', () => {
      const yaml = 'key: "Hello {% unknownTag %} world"';
      const result = validateLiquidTemplate(yaml);
      expect(result).toHaveLength(1);
      const tagStart = yaml.indexOf('unknownTag');
      expect(result[0].startColumn).toBe(tagStart + 1);
      expect(result[0].endColumn).toBe(tagStart + 'unknownTag'.length + 1);
    });

    it('should fall back to full node range for unclosed expressions', () => {
      const yaml = 'key: "Hello {{ unclosed world"';
      const result = validateLiquidTemplate(yaml);
      expect(result).toHaveLength(1);
      // No specific token to pinpoint — falls back to the whole node
      const nodeStart = yaml.indexOf('"Hello');
      expect(result[0].startColumn).toBe(nodeStart + 1);
    });

    it('should pinpoint the first occurrence of a repeated filter', () => {
      const yaml = [
        'a: "{{ name | badFilter }}"',
        'b: "{{ other | badFilter }}"',
      ].join('\n');
      const result = validateLiquidTemplate(yaml);
      expect(result).toHaveLength(2);

      const firstFilterStart = yaml.indexOf('badFilter');
      expect(result[0].startColumn).toBe(firstFilterStart + 1);
    });

    it('should pinpoint filter on correct line in multi-line YAML', () => {
      const yaml = [
        'ok: "valid value"',
        'bad: "{{ name | oopsFilter }}"',
        'also_ok: "fine"',
      ].join('\n');
      const result = validateLiquidTemplate(yaml);
      expect(result).toHaveLength(1);
      expect(result[0].startLine).toBe(2);
      // Column should point to "oopsFilter" within line 2
      const line2 = 'bad: "{{ name | oopsFilter }}"';
      const filterCol = line2.indexOf('oopsFilter') + 1;
      expect(result[0].startColumn).toBe(filterCol);
    });
  });

  describe('YAML parse failures', () => {
    it('should return empty array for invalid YAML', () => {
      expect(validateLiquidTemplate('invalid: yaml: content: [')).toEqual([]);
    });
  });

  describe('only validates string values', () => {
    it('should not flag Liquid-like syntax in YAML comments', () => {
      const yaml = [
        '# {{ unclosed comment',
        'key: normal value',
      ].join('\n');
      expect(validateLiquidTemplate(yaml)).toEqual([]);
    });

    it('should not flag valid Liquid syntax in YAML keys', () => {
      const yaml = '"{{ some_key }}": value';
      expect(validateLiquidTemplate(yaml)).toEqual([]);
    });

    it('should not flag invalid Liquid syntax in YAML keys', () => {
      const yaml = '"{{ key | unknownFilter }}": value';
      expect(validateLiquidTemplate(yaml)).toEqual([]);
    });

    it('should not flag invalid Liquid syntax in YAML keys', () => {
      const yaml = '"{{ key | unknownFilter }}": value';
      expect(validateLiquidTemplate(yaml)).toEqual([]);
    });
  });
});
