/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MUSTACHE_REGEX_GLOBAL, UNFINISHED_MUSTACHE_REGEX_GLOBAL } from './regex';

describe('Mustache regex patterns', () => {
  describe('MUSTACHE_REGEX_GLOBAL', () => {
    beforeEach(() => {
      // Reset regex state before each test
      MUSTACHE_REGEX_GLOBAL.lastIndex = 0;
    });

    it('should match basic mustache expressions', () => {
      const text = 'Hello {{ name }}, welcome!';
      const matches = [...text.matchAll(MUSTACHE_REGEX_GLOBAL)];

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.key).toBe('name');
      expect(matches[0][0]).toBe('{{ name }}');
    });

    it('should match multiple mustache expressions', () => {
      const text = '{{ consts.apiUrl }}/users/{{ steps.getUser.output.id }}';
      const matches = [...text.matchAll(MUSTACHE_REGEX_GLOBAL)];

      expect(matches).toHaveLength(2);
      expect(matches[0].groups?.key).toBe('consts.apiUrl');
      expect(matches[1].groups?.key).toBe('steps.getUser.output.id');
    });

    it('should handle whitespace variations', () => {
      const variations = ['{{name}}', '{{ name }}', '{{  name  }}', '{{ name}}', '{{name }}'];

      variations.forEach((variation) => {
        MUSTACHE_REGEX_GLOBAL.lastIndex = 0;
        const matches = [...variation.matchAll(MUSTACHE_REGEX_GLOBAL)];
        expect(matches).toHaveLength(1);
        expect(matches[0].groups?.key).toBe('name');
      });
    });

    it('should not match incomplete expressions', () => {
      const incompleteExpressions = ['{ name }', '{{ name', 'name }}'];

      incompleteExpressions.forEach((expr) => {
        MUSTACHE_REGEX_GLOBAL.lastIndex = 0;
        const matches = [...expr.matchAll(MUSTACHE_REGEX_GLOBAL)];
        expect(matches).toHaveLength(0);
      });
    });
  });

  describe('UNFINISHED_MUSTACHE_REGEX_GLOBAL', () => {
    beforeEach(() => {
      UNFINISHED_MUSTACHE_REGEX_GLOBAL.lastIndex = 0;
    });

    it('should match unfinished mustache expressions at end of string', () => {
      const text = 'message: "{{ consts.api';
      const matches = [...text.matchAll(UNFINISHED_MUSTACHE_REGEX_GLOBAL)];

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.key).toBe('consts.api');
    });

    it('should match unfinished expressions with trailing dot', () => {
      const text = 'value: {{ steps.';
      const matches = [...text.matchAll(UNFINISHED_MUSTACHE_REGEX_GLOBAL)];

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.key).toBe('steps.');
    });
  });

  describe('Edge cases', () => {
    it('should handle nested object paths', () => {
      const text = '{{ steps.fetchUser.output.data.profile.name }}';
      MUSTACHE_REGEX_GLOBAL.lastIndex = 0;
      const matches = [...text.matchAll(MUSTACHE_REGEX_GLOBAL)];

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.key).toBe('steps.fetchUser.output.data.profile.name');
    });

    it('should handle expressions with numbers', () => {
      const text = '{{ steps.step1.output.data.0 }}';
      MUSTACHE_REGEX_GLOBAL.lastIndex = 0;
      const matches = [...text.matchAll(MUSTACHE_REGEX_GLOBAL)];

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.key).toBe('steps.step1.output.data.0');
    });
  });
});
