/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  VARIABLE_REGEX_GLOBAL,
  UNFINISHED_VARIABLE_REGEX_GLOBAL,
  ALLOWED_KEY_REGEX,
  PROPERTY_PATH_REGEX,
  LIQUID_FILTER_REGEX,
} from './regex';

describe('regex patterns', () => {
  describe('VARIABLE_REGEX_GLOBAL', () => {
    it('should match complete mustache expressions', () => {
      const text = 'Hello {{ user.name }} and {{ item.price }}!';
      const matches = [...text.matchAll(VARIABLE_REGEX_GLOBAL)];

      expect(matches).toHaveLength(2);
      expect(matches[0].groups?.key).toBe('user.name');
      expect(matches[1].groups?.key).toBe('item.price');
    });

    it('should match mustache with whitespace', () => {
      const text = 'Value: {{  steps.getData.output  }}';
      const matches = [...text.matchAll(VARIABLE_REGEX_GLOBAL)];

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.key).toBe('steps.getData.output');
    });

    it('should not match incomplete mustache', () => {
      const text = 'Incomplete: {{ user.name';
      const matches = [...text.matchAll(VARIABLE_REGEX_GLOBAL)];

      expect(matches).toHaveLength(0);
    });
  });

  describe('UNFINISHED_VARIABLE_REGEX_GLOBAL', () => {
    it('should match unfinished mustache at end of line', () => {
      const text = 'Message: {{ user.name';
      const matches = [...text.matchAll(UNFINISHED_VARIABLE_REGEX_GLOBAL)];

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.key).toBe('user.name');
    });

    it('should match unfinished mustache with partial key', () => {
      const text = 'Value: {{ steps.getData.out';
      const matches = [...text.matchAll(UNFINISHED_VARIABLE_REGEX_GLOBAL)];

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.key).toBe('steps.getData.out');
    });

    it('should match mustache with just opening braces', () => {
      const text = 'Start: {{ ';
      const matches = [...text.matchAll(UNFINISHED_VARIABLE_REGEX_GLOBAL)];

      expect(matches).toHaveLength(1);
      expect(matches[0].groups?.key).toBe('');
    });

    it('should not match complete mustache', () => {
      const text = 'Complete: {{ user.name }} more';
      const matches = [...text.matchAll(UNFINISHED_VARIABLE_REGEX_GLOBAL)];

      expect(matches).toHaveLength(0);
    });
  });

  describe('ALLOWED_KEY_REGEX', () => {
    it('should match valid property paths', () => {
      const validPaths = [
        'user',
        'user.name',
        'steps.step1.output',
        'items[0]',
        'users["john"]',
        "data['key']",
        'user.contacts[0].email',
        'response.data["user-info"].name',
      ];

      validPaths.forEach((path) => {
        expect(ALLOWED_KEY_REGEX.test(path)).toBe(true);
      });
    });

    it('should match paths with liquid filters', () => {
      const pathsWithFilters = [
        'user.name | upcase',
        'price | round: 2',
        'items | map: "title" | join: ", "',
      ];

      pathsWithFilters.forEach((path) => {
        expect(ALLOWED_KEY_REGEX.test(path)).toBe(true);
      });
    });

    it('should not match invalid property paths', () => {
      const invalidPaths = [
        '123invalid', // starts with number
        '.user', // starts with dot
        'user..name', // double dots
        'user[abc]', // unquoted string in brackets
        'user]invalid[', // wrong bracket order
      ];

      invalidPaths.forEach((path) => {
        expect(ALLOWED_KEY_REGEX.test(path)).toBe(false);
      });
    });
  });

  describe('PROPERTY_PATH_REGEX', () => {
    it('should match valid property paths without filters', () => {
      const validPaths = [
        'user',
        'user.name',
        'steps.step1.output',
        'items[0]',
        'users["john"]',
        "data['key']",
        'user.contacts[0].email',
        'response.data["user-info"].name',
      ];

      validPaths.forEach((path) => {
        expect(PROPERTY_PATH_REGEX.test(path)).toBe(true);
      });
    });

    it('should not match paths with liquid filters', () => {
      const pathsWithFilters = ['user.name | upcase', 'price | round: 2', 'items | map: "title"'];

      pathsWithFilters.forEach((path) => {
        expect(PROPERTY_PATH_REGEX.test(path)).toBe(false);
      });
    });

    it('should not match invalid property paths', () => {
      const invalidPaths = [
        '123invalid', // starts with number
        '.user', // starts with dot
        'user..name', // double dots
        'user[abc]', // unquoted string in brackets
      ];

      invalidPaths.forEach((path) => {
        expect(PROPERTY_PATH_REGEX.test(path)).toBe(false);
      });
    });
  });

  describe('LIQUID_FILTER_REGEX', () => {
    it('should match liquid filter at end of line', () => {
      const testCases = [
        { text: '{{ user.name | ', expected: '' },
        { text: '{{ user.name | up', expected: 'up' },
        { text: '{{ user.name | upcase', expected: 'upcase' },
        { text: '  {{ user.firstName | ', expected: '' },
        { text: '  {{ data.items[0].name | size', expected: 'size' },
        { text: 'value: {{ price | round', expected: 'round' },
      ];

      testCases.forEach(({ text, expected }) => {
        const match = text.match(LIQUID_FILTER_REGEX);
        expect(match).toBeTruthy();
        expect(match![1]).toBe(expected);
      });
    });

    it('should not match liquid filter not at end of line', () => {
      const testCases = [
        '{{ user.name | upcase }} more text',
        '{{ user.name | upcase }}',
        'text {{ user.name | }} more',
        'normal | pipe character',
      ];

      testCases.forEach((text) => {
        const match = text.match(LIQUID_FILTER_REGEX);
        expect(match).toBeNull();
      });
    });

    it('should handle whitespace around filter', () => {
      const testCases = [
        { text: '{{  user.name  |  ', expected: '' },
        { text: '{{ user.name |up', expected: 'up' },
        { text: '{{ user.name | up ', expected: 'up' },
        { text: '{{user.name|filter', expected: 'filter' },
      ];

      testCases.forEach(({ text, expected }) => {
        const match = text.match(LIQUID_FILTER_REGEX);
        expect(match).toBeTruthy();
        expect(match![1]).toBe(expected);
      });
    });

    it('should not match without mustache braces', () => {
      const testCases = [
        'user.name | filter',
        'text | more text',
        '{ user.name | filter',
        'user.name } | filter',
      ];

      testCases.forEach((text) => {
        const match = text.match(LIQUID_FILTER_REGEX);
        expect(match).toBeNull();
      });
    });

    it('should match complex variable paths with filters', () => {
      const testCases = [
        { text: '{{ steps.fetchUser.output.profile.name | ', expected: '' },
        { text: '{{ items[0]["user-data"].emails[1] | lower', expected: 'lower' },
        { text: '{{ response.data["api-key"] | ', expected: '' },
      ];

      testCases.forEach(({ text, expected }) => {
        const match = text.match(LIQUID_FILTER_REGEX);
        expect(match).toBeTruthy();
        expect(match![1]).toBe(expected);
      });
    });

    it('should handle multiple pipes in variable expression', () => {
      // Should match the last filter being typed
      const text = '{{ user.name | upcase | append: "!" | ';
      const match = text.match(LIQUID_FILTER_REGEX);

      expect(match).toBeTruthy();
      expect(match![1]).toBe('');
    });
  });
});
