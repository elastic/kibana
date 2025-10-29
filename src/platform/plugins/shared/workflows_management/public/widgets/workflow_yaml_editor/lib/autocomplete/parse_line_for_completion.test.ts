/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseLineForCompletion } from './parse_line_for_completion';

describe('parseLineForCompletion', () => {
  describe('@ trigger scenarios', () => {
    it('should parse @ trigger without key', () => {
      const result = parseLineForCompletion('message: "@');
      expect(result?.matchType).toBe('at');
      expect(result?.fullKey).toBe('');
    });

    it('should parse @ trigger with simple key', () => {
      const result = parseLineForCompletion('message: "@consts');
      expect(result?.matchType).toBe('at');
      expect(result?.fullKey).toBe('consts');
    });

    it('should parse @ trigger with dotted path', () => {
      const result = parseLineForCompletion('message: "@steps.step1');
      expect(result?.matchType).toBe('at');
      expect(result?.fullKey).toBe('steps.step1');
    });

    it('should parse @ trigger with trailing dot', () => {
      const result = parseLineForCompletion('message: "@consts.');
      expect(result?.matchType).toBe('at');
      expect(result?.fullKey).toBe('consts');
    });
  });

  describe('mustache unfinished scenarios', () => {
    it('should parse unfinished mustache at end of line', () => {
      const result = parseLineForCompletion('message: "{{ consts');
      expect(result?.matchType).toBe('variable-unfinished');
      expect(result?.fullKey).toBe('consts');
    });

    it('should parse unfinished mustache with dotted path', () => {
      const result = parseLineForCompletion('url: "{{ consts.api');
      expect(result?.matchType).toBe('variable-unfinished');
      expect(result?.fullKey).toBe('consts.api');
    });

    it('should parse unfinished mustache with trailing dot', () => {
      const result = parseLineForCompletion('value: {{ steps.');
      expect(result?.matchType).toBe('variable-unfinished');
      expect(result?.fullKey).toBe('steps');
    });
  });

  describe('complete mustache scenarios', () => {
    it('should parse complete mustache expression', () => {
      const result = parseLineForCompletion('message: "{{ consts.apiUrl }} - more text');
      expect(result?.matchType).toBe('variable-complete');
      expect(result?.fullKey).toBe('consts.apiUrl');
    });

    it('should parse last complete mustache when multiple present', () => {
      const result = parseLineForCompletion('url: {{ consts.baseUrl }}/users/{{ steps.getUser');
      expect(result?.matchType).toBe('variable-unfinished');
      expect(result?.fullKey).toBe('steps.getUser');
    });

    it('should parse complex nested path', () => {
      const result = parseLineForCompletion('data: {{ steps.fetchData.output.results.items }}');
      expect(result?.matchType).toBe('variable-complete');
      expect(result?.fullKey).toBe('steps.fetchData.output.results.items');
    });
  });

  describe('priority handling', () => {
    it('should prioritize @ trigger over mustache', () => {
      const result = parseLineForCompletion('{{ consts.old }} @steps');
      expect(result?.matchType).toBe('at');
      expect(result?.fullKey).toBe('steps');
    });

    it('should prioritize unfinished over complete mustache', () => {
      const result = parseLineForCompletion('{{ consts.apiUrl }} and {{ steps.step1');
      expect(result?.matchType).toBe('variable-unfinished');
      expect(result?.fullKey).toBe('steps.step1');
    });
  });

  describe('no match scenarios', () => {
    it('should return null for plain text', () => {
      const result = parseLineForCompletion('message: "hello world"');
      expect(result).toBeNull();
    });

    it('should return null for incomplete brackets', () => {
      const result = parseLineForCompletion('message: "{ consts.api }');
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should parse special dot in mustache', () => {
      const result = parseLineForCompletion('message: "{{ . }}');
      expect(result?.matchType).toBe('variable-complete');
      expect(result?.fullKey).toBe('.');
    });

    it('should handle whitespace in mustache expressions', () => {
      const result = parseLineForCompletion('message: "{{  consts.apiUrl  }} other');
      expect(result?.matchType).toBe('variable-complete');
      expect(result?.fullKey).toBe('consts.apiUrl');
    });
    // matches as 'liquid-block-keyword' which is then filtered out
    // later by the completion provider's isInsideLiquidBlock check
    it('should handle empty line', () => {
      const result = parseLineForCompletion('');
      expect(result?.matchType).toBe('liquid-block-keyword');
      expect(result?.fullKey).toBe('');
    });
    // matches as 'liquid-block-keyword' which is then filtered out
    // later by the completion provider's isInsideLiquidBlock check
    it('should handle line with only spaces', () => {
      const result = parseLineForCompletion('    ');
      expect(result?.matchType).toBe('liquid-block-keyword');
      expect(result?.fullKey).toBe('');
    });
  });

  describe('liquid filter scenarios', () => {
    it('should parse liquid filter at end of line', () => {
      const result = parseLineForCompletion('message: "{{ user.name | ');
      expect(result?.matchType).toBe('liquid-filter');
      expect(result?.fullKey).toBe('');
      expect(result?.match).toBeTruthy();
    });

    it('should parse liquid filter with partial filter name', () => {
      const result = parseLineForCompletion('value: {{ price | up');
      expect(result?.matchType).toBe('liquid-filter');
      expect(result?.fullKey).toBe('up');
      expect(result?.match).toBeTruthy();
    });

    it('should parse liquid filter with complex variable path', () => {
      const result = parseLineForCompletion('data: {{ steps.fetchUser.output.name | ');
      expect(result?.matchType).toBe('liquid-filter');
      expect(result?.fullKey).toBe('');
    });

    it('should parse liquid filter with array access', () => {
      const result = parseLineForCompletion('item: {{ items[0].title | cap');
      expect(result?.matchType).toBe('liquid-filter');
      expect(result?.fullKey).toBe('cap');
    });

    it('should parse liquid filter with whitespace', () => {
      const result = parseLineForCompletion('text: {{  user.name  |  up');
      expect(result?.matchType).toBe('liquid-filter');
      expect(result?.fullKey).toBe('up');
    });

    it('should not match liquid filter if not at end of line', () => {
      const result = parseLineForCompletion('text: {{ user.name | upcase }} more content');
      expect(result?.matchType).not.toBe('liquid-filter');
    });

    it('should not match liquid filter without pipe', () => {
      const result = parseLineForCompletion('text: {{ user.name ');
      expect(result?.matchType).toBe('variable-unfinished');
    });

    it('should not match liquid filter in regular text', () => {
      const result = parseLineForCompletion('text: "normal | pipe character"');
      expect(result).toBeNull();
    });
  });

  describe('liquid block filter scenarios', () => {
    it('should parse liquid block filter at end of line', () => {
      const result = parseLineForCompletion('  assign variable = value | ');
      expect(result?.matchType).toBe('liquid-block-filter');
      expect(result?.fullKey).toBe('');
    });

    it('should parse liquid block filter with prefix', () => {
      const result = parseLineForCompletion('  assign variable = data | up');
      expect(result?.matchType).toBe('liquid-block-filter');
      expect(result?.fullKey).toBe('up');
    });

    it('should parse liquid block filter in complex expression', () => {
      const result = parseLineForCompletion('  assign result = foreach.item | down');
      expect(result?.matchType).toBe('liquid-block-filter');
      expect(result?.fullKey).toBe('down');
    });

    it('should parse liquid block filter with spaces', () => {
      const result = parseLineForCompletion('assign   variable   =   value   |   cap');
      expect(result?.matchType).toBe('liquid-block-filter');
      expect(result?.fullKey).toBe('cap');
    });

    it('should parse liquid block filter in echo statement', () => {
      const result = parseLineForCompletion('  echo message | ');
      expect(result?.matchType).toBe('liquid-block-filter');
      expect(result?.fullKey).toBe('');
    });

    it('should not match liquid block filter within mustache', () => {
      const result = parseLineForCompletion('  assign var = {{ value | filter');
      expect(result?.matchType).toBe('liquid-filter');
      expect(result?.fullKey).toBe('filter');
    });

    it('should parse liquid block filter without leading spaces', () => {
      const result = parseLineForCompletion('assign message = value | ');
      expect(result?.matchType).toBe('liquid-block-filter');
      expect(result?.fullKey).toBe('');
    });

    it('should parse liquid block filter with tab indentation', () => {
      const result = parseLineForCompletion('\tassign variable = value | fil');
      expect(result?.matchType).toBe('liquid-block-filter');
      expect(result?.fullKey).toBe('fil');
    });

    it('should parse liquid block filter with tabs around pipe', () => {
      const result = parseLineForCompletion('\techo\tmessage\t|\tup');
      expect(result?.matchType).toBe('liquid-block-filter');
      expect(result?.fullKey).toBe('up');
    });
  });

  describe('liquid syntax scenarios', () => {
    it('should parse liquid syntax block start', () => {
      const result = parseLineForCompletion('  {% ');
      expect(result?.matchType).toBe('liquid-syntax');
      expect(result?.fullKey).toBe('');
    });

    it('should parse liquid syntax with partial keyword', () => {
      const result = parseLineForCompletion('{% if');
      expect(result?.matchType).toBe('liquid-syntax');
      expect(result?.fullKey).toBe('if');
    });

    it('should parse liquid syntax with partial assign', () => {
      const result = parseLineForCompletion('  {% ass');
      expect(result?.matchType).toBe('liquid-syntax');
      expect(result?.fullKey).toBe('ass');
    });

    it('should parse liquid syntax with whitespace', () => {
      const result = parseLineForCompletion('  {%  for');
      expect(result?.matchType).toBe('liquid-syntax');
      expect(result?.fullKey).toBe('for');
    });

    it('should not match liquid syntax if not at end of line', () => {
      const result = parseLineForCompletion('{% if condition %} content');
      expect(result).toBeNull();
    });

    it('should not match liquid syntax without %', () => {
      const result = parseLineForCompletion('{ if ');
      expect(result).toBeNull();
    });
  });

  describe('liquid block keyword scenarios', () => {
    it('should parse liquid block keyword at start of line', () => {
      const result = parseLineForCompletion('assign');
      expect(result?.matchType).toBe('liquid-block-keyword');
      expect(result?.fullKey).toBe('assign');
    });

    it('should parse liquid block keyword with indentation', () => {
      const result = parseLineForCompletion('  case');
      expect(result?.matchType).toBe('liquid-block-keyword');
      expect(result?.fullKey).toBe('case');
    });

    it('should parse partial liquid block keyword', () => {
      const result = parseLineForCompletion('  ass');
      expect(result?.matchType).toBe('liquid-block-keyword');
      expect(result?.fullKey).toBe('ass');
    });

    it('should parse completely empty line as liquid block keyword', () => {
      const result = parseLineForCompletion('');
      expect(result?.matchType).toBe('liquid-block-keyword');
      expect(result?.fullKey).toBe('');
    });

    it('should parse line with only whitespace as liquid block keyword', () => {
      const result = parseLineForCompletion('    ');
      expect(result?.matchType).toBe('liquid-block-keyword');
      expect(result?.fullKey).toBe('');
    });

    it('should parse line with tabs as liquid block keyword', () => {
      const result = parseLineForCompletion('\t\t');
      expect(result?.matchType).toBe('liquid-block-keyword');
      expect(result?.fullKey).toBe('');
    });

    it('should parse liquid block keyword with tab indentation', () => {
      const result = parseLineForCompletion('\tassign');
      expect(result?.matchType).toBe('liquid-block-keyword');
      expect(result?.fullKey).toBe('assign');
    });

    it('should parse partial liquid block keyword with tabs', () => {
      const result = parseLineForCompletion('\t\tass');
      expect(result?.matchType).toBe('liquid-block-keyword');
      expect(result?.fullKey).toBe('ass');
    });

    it('should parse liquid block keyword with mixed tab and space indentation', () => {
      const result = parseLineForCompletion('\t  case');
      expect(result?.matchType).toBe('liquid-block-keyword');
      expect(result?.fullKey).toBe('case');
    });

    it('should parse liquid block keyword with trailing space', () => {
      const result = parseLineForCompletion('echo ');
      expect(result?.matchType).toBe('liquid-block-keyword');
      expect(result?.fullKey).toBe('echo');
    });

    it('should not match liquid block keyword with complex content', () => {
      const result = parseLineForCompletion('assign variable = "value"');
      expect(result).toBeNull();
    });
  });

  describe('liquid priority handling', () => {
    it('should prioritize liquid filter over unfinished mustache', () => {
      const result = parseLineForCompletion('{{ consts.api | ');
      expect(result?.matchType).toBe('liquid-filter');
    });

    it('should prioritize liquid filter over complete mustache when at end', () => {
      const result = parseLineForCompletion('{{ consts.apiUrl }} {{ user.name | fil');
      expect(result?.matchType).toBe('liquid-filter');
      expect(result?.fullKey).toBe('fil');
    });

    it('should prioritize @ trigger over liquid syntax', () => {
      const result = parseLineForCompletion('{% if @steps');
      expect(result?.matchType).toBe('at');
      expect(result?.fullKey).toBe('steps');
    });
  });
});
