/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { validateLiquidTemplate } from './validate_liquid_template';

const validate = (yamlString: string) =>
  validateLiquidTemplate(yamlString, parseDocument(yamlString));

describe('validateLiquidTemplate (common)', () => {
  describe('valid templates', () => {
    it('should return empty array for valid liquid template', () => {
      expect(validate('message: "Hello {{ name }} world"')).toEqual([]);
    });

    it('should return empty array for template with filters', () => {
      expect(validate('message: "Hello {{ name | capitalize }} world"')).toEqual([]);
    });

    it('should return empty array for template with tags', () => {
      expect(validate('message: "Hello {% if condition %}world{% endif %}"')).toEqual([]);
    });

    it('should return empty array for complex valid template', () => {
      const yamlString = `message: "Hello {{ user.name | capitalize }} {% if user.isActive %}Welcome back!{% else %}Please activate your account{% endif %} {% for item in items %}{{ item.title }}{% endfor %}"`;
      expect(validate(yamlString)).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(validate('')).toEqual([]);
    });

    it('should return empty array for plain text', () => {
      expect(validate('Just plain text without any liquid syntax')).toEqual([]);
    });

    it('should return empty array when comment lines contain valid liquid syntax', () => {
      const yamlString = `name: test
# {{ steps.foo.output | json }}
steps:
  - name: step1
    type: console`;
      expect(validate(yamlString)).toEqual([]);
    });

    it('should return empty array when comment lines contain invalid liquid syntax', () => {
      const yamlString = `name: test
# {{ unclosed
# {% unknownTag %}
steps:
  - name: step1
    type: console`;
      expect(validate(yamlString)).toEqual([]);
    });

    it('should return empty array for indented comment lines with liquid variables', () => {
      const yamlString = `name: test
steps:
  - name: step1
    # old: "{{ deprecated_var | unknownFilter }}"
    type: console`;
      expect(validate(yamlString)).toEqual([]);
    });

    it('should return empty array when inline comments contain valid liquid syntax', () => {
      const yamlString = `name: test
steps:
  - name: step1
    type: console  # was {{ steps.old.output | json }}
    with:
      message: hello`;
      expect(validate(yamlString)).toEqual([]);
    });

    it('should return empty array when inline comments contain invalid liquid syntax', () => {
      const yamlString = `name: test
steps:
  - name: step1
    type: console  # {{ unclosed
    with:
      message: hello`;
      expect(validate(yamlString)).toEqual([]);
    });

    it('should not strip # inside quoted strings while stripping inline comments', () => {
      const yamlString = `name: test
steps:
  - name: step1
    type: console
    with:
      message: "value # not a comment"  # {{ realComment }}`;
      expect(validate(yamlString)).toEqual([]);
    });
  });

  describe('invalid templates', () => {
    it('should return errors for undefined filter', () => {
      const result = validate('message: "Hello {{ name | unknownFilter }} world"');
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('unknownFilter');
      expect(result[0].startLine).toBeGreaterThan(0);
      expect(result[0].startColumn).toBeGreaterThan(0);
    });

    it('should return errors for unclosed output', () => {
      const result = validate('message: "Hello {{ unclosed world"');
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('not closed');
    });

    it('should return errors for unclosed tag expressions', () => {
      const result = validate('message: "Hello {% unclosed world"');
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('not closed');
    });

    it('should return errors for unknown tag', () => {
      const result = validate('message: "Hello {% unknownTag %} world"');
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('unknownTag');
    });

    it('should not return errors for single-brace text', () => {
      expect(validate('Hello { not liquid } world')).toEqual([]);
    });

    it('should still return errors for invalid liquid on non-comment lines even when comments are present', () => {
      const yamlString = `# valid comment with {{ var }}
name: test
message: "{{ name | unknownFilter }}"`;
      const result = validate(yamlString);
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('unknownFilter');
      expect(result[0].startLine).toBe(3);
    });

    it('should still return errors for invalid liquid before an inline comment on the same line', () => {
      const yamlString = 'message: "{{ name | unknownFilter }}" # valid comment';
      const result = validate(yamlString);
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('unknownFilter');
    });
  });

  describe('error format', () => {
    it('should return LiquidValidationError with all required fields', () => {
      const result = validate('message: "{{ name | unknownFilter }}"');
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('message');
      expect(result[0]).toHaveProperty('startLine');
      expect(result[0]).toHaveProperty('startColumn');
      expect(result[0]).toHaveProperty('endLine');
      expect(result[0]).toHaveProperty('endColumn');
    });

    it('should remove line and column numbers from customer-facing messages', () => {
      const result = validate('message: "Hello {{ name | unknownFilter }} world"');
      expect(result).toHaveLength(1);
      expect(result[0].message).not.toContain('line:');
      expect(result[0].message).not.toContain('col:');
    });
  });

  describe('block scalars', () => {
    it('should return empty array for valid liquid in a literal block scalar', () => {
      const yamlString = `message: |
  Hello {{ name }} world
  {{ items | join: ", " }}`;
      expect(validate(yamlString)).toEqual([]);
    });

    it('should return empty array for valid liquid in a folded block scalar', () => {
      const yamlString = `message: >
  Hello {{ name }} world
  {{ items | join: ", " }}`;
      expect(validate(yamlString)).toEqual([]);
    });

    it('should return errors for invalid liquid in a literal block scalar', () => {
      const yamlString = `message: |
  Hello {{ name | unknownFilter }} world`;
      const result = validate(yamlString);
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('unknownFilter');
      expect(result[0].startLine).toBe(2);
    });

    it('should return errors for invalid liquid in a folded block scalar', () => {
      const yamlString = `message: >
  Hello {{ name | unknownFilter }} world`;
      const result = validate(yamlString);
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('unknownFilter');
      expect(result[0].startLine).toBe(2);
    });

    it('should not treat # inside a block scalar as a comment', () => {
      const yamlString = `message: |
  Hello # this is content {{ name }} world`;
      expect(validate(yamlString)).toEqual([]);
    });
  });

  describe('multiple errors', () => {
    it('should report errors from multiple scalars in the same document', () => {
      const yamlString = `key1: "{{ name | badFilter }}"
key2: "{% unknownTag %}"`;
      const result = validate(yamlString);
      expect(result).toHaveLength(2);
      expect(result[0].message).toContain('badFilter');
      expect(result[0].startLine).toBe(1);
      expect(result[1].message).toContain('unknownTag');
      expect(result[1].startLine).toBe(2);
    });
  });

  describe('sequence items', () => {
    it('should validate liquid in sequence items', () => {
      const yamlString = `items:
  - "{{ name | unknownFilter }}"`;
      const result = validate(yamlString);
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('unknownFilter');
    });

    it('should return empty array for valid liquid in sequence items', () => {
      const yamlString = `items:
  - "{{ name | capitalize }}"
  - "{% if flag %}yes{% endif %}"`;
      expect(validate(yamlString)).toEqual([]);
    });
  });

  describe('YAML keys', () => {
    it('should skip liquid validation in map keys', () => {
      const yamlString = '"{{ dynamic_key }}": some value';
      expect(validate(yamlString)).toEqual([]);
    });

    it('should skip invalid liquid in map keys without reporting errors', () => {
      const yamlString = '"{{ unclosed": some value';
      expect(validate(yamlString)).toEqual([]);
    });
  });

  describe('position conversion', () => {
    it('should convert offset to line/column correctly for single line', () => {
      const result = validate('message: "Hello {{ name | unknownFilter }} world"');
      expect(result).toHaveLength(1);
      expect(result[0].startLine).toBe(1);
      expect(result[0].startColumn).toBeGreaterThan(1);
      expect(result[0].endLine).toBe(1);
      expect(result[0].endColumn).toBeGreaterThan(result[0].startColumn);
    });

    it('should convert offset to line/column correctly for multi-line', () => {
      const yamlString = `key1: Line 1
key2: "Line 2 with {{ error | unknownFilter }} here"
key3: Line 3`;

      const result = validate(yamlString);

      expect(result).toHaveLength(1);
      expect(result[0].startLine).toBe(2);
      expect(result[0].endLine).toBe(2);
    });

    it('should handle position at the beginning of a value', () => {
      const result = validate('message: "{{ name | unknownFilter }} at start"');
      expect(result).toHaveLength(1);
      expect(result[0].startLine).toBe(1);
    });

    it('should handle position at the end of a value', () => {
      const result = validate('message: "at end {{ name | unknownFilter }}"');
      expect(result).toHaveLength(1);
      expect(result[0].startLine).toBe(1);
      expect(result[0].startColumn).toBeGreaterThan(1);
    });
  });
});
