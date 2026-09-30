/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALLOWED_KEY_REGEX,
  isLiquidTagValue,
  LIQUID_FILTER_REGEX,
  matchAllVariables,
  matchLastUnfinishedVariable,
  matchVariable,
  PROPERTY_PATH_REGEX,
  UNFINISHED_VARIABLE_REGEX_GLOBAL,
  VARIABLE_REGEX_GLOBAL,
} from './regex';

describe('regex patterns', () => {
  describe('matchAllVariables', () => {
    it('should match complete mustache expressions', () => {
      const matches = matchAllVariables('Hello {{ user.name }} and {{ item.price }}!');

      expect(matches).toHaveLength(2);
      expect(matches[0].groups.key).toBe('user.name');
      expect(matches[1].groups.key).toBe('item.price');
    });

    it('should trim padding the key class absorbed', () => {
      const matches = matchAllVariables('Value: {{  steps.getData.output  }}');

      expect(matches).toHaveLength(1);
      expect(matches[0].groups.key).toBe('steps.getData.output');
      expect(matches[0][0]).toBe('{{  steps.getData.output  }}');
    });

    it('should report an empty key for an empty expression', () => {
      expect(matchVariable('{{}}')?.groups.key).toBe('');
      expect(matchVariable('{{ }}')?.groups.key).toBe('');
    });

    it('should not match incomplete mustache', () => {
      expect(matchAllVariables('Incomplete: {{ user.name')).toHaveLength(0);
    });

    it('should keep the match offset so callers can map it back to the document', () => {
      const [match] = matchAllVariables('ab {{ x }}');

      expect(match.index).toBe(3);
    });
  });

  describe('matchLastUnfinishedVariable', () => {
    it('should match unfinished mustache at end of line', () => {
      expect(matchLastUnfinishedVariable('Message: {{ user.name')?.groups.key).toBe('user.name');
    });

    it('should match unfinished mustache with partial key', () => {
      expect(matchLastUnfinishedVariable('Value: {{ steps.getData.out')?.groups.key).toBe(
        'steps.getData.out'
      );
    });

    it('should match mustache with just opening braces', () => {
      expect(matchLastUnfinishedVariable('Start: {{ ')?.groups.key).toBe('');
    });

    it('should not match complete mustache', () => {
      expect(matchLastUnfinishedVariable('Complete: {{ user.name }} more')).toBeNull();
    });
  });

  describe('mustache pattern complexity', () => {
    // An earlier form padded a lazy key with `\s*` on both sides. Because the key class
    // also matches whitespace, an unclosed `{{` followed by a whitespace run forced the
    // engine through every split of that run: 8k tabs took ~88s (CodeQL js/polynomial-redos).
    const REDOS_INPUT = `{{${'\t'.repeat(1_000_000)}`;

    it('scans a long unclosed run in linear time', () => {
      const start = Date.now();

      expect(matchAllVariables(REDOS_INPUT)).toHaveLength(0);
      expect([...REDOS_INPUT.matchAll(VARIABLE_REGEX_GLOBAL)]).toHaveLength(0);
      expect([...REDOS_INPUT.matchAll(UNFINISHED_VARIABLE_REGEX_GLOBAL)]).toHaveLength(1);

      expect(Date.now() - start).toBeLessThan(1_000);
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
        'user[abc]',
        'inputs.payload.rules[ep.rule_id].name',
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
        'user[abc-def]', // hyphenated unquoted key (must be quoted)
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
        'user[abc]',
        'inputs.payload.rules[ep.rule_id].name',
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
        'user[abc-def]', // hyphenated unquoted key (must be quoted)
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

  describe('isLiquidTagValue', () => {
    it('should return true for Liquid tags with {% ... %}', () => {
      expect(isLiquidTagValue('{% if condition %}')).toBe(true);
      expect(isLiquidTagValue('{% assign x = 5 %}')).toBe(true);
      expect(isLiquidTagValue('{% endif %}')).toBe(true);
    });

    it('should return true for Liquid tags with {%- ... -%}', () => {
      expect(isLiquidTagValue('{%- if condition -%}')).toBe(true);
      expect(isLiquidTagValue('{%- assign x = 5 -%}')).toBe(true);
    });

    it('should return true for multi-line Liquid tag blocks', () => {
      const multiLine = `{%- if steps.get_source_version.output.severity == "critical" -%}
critical
{%- endif -%}`;
      expect(isLiquidTagValue(multiLine)).toBe(true);
    });

    it('should return false for non-string values', () => {
      expect(isLiquidTagValue(null)).toBe(false);
      expect(isLiquidTagValue(123)).toBe(false);
      expect(isLiquidTagValue({})).toBe(false);
    });

    it('should return false for strings without Liquid tags', () => {
      expect(isLiquidTagValue('regular string')).toBe(false);
      expect(isLiquidTagValue('{{ variable }}')).toBe(false);
      expect(isLiquidTagValue('${{ dynamic }}')).toBe(false);
    });
  });
});
