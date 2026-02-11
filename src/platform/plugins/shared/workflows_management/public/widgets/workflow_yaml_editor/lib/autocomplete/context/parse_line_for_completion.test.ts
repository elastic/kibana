/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ConnectorIdLineParseResult,
  ForeachVariableLineParseResult,
  TypeLineParseResult,
} from './parse_line_for_completion';
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

    it('should parse @ trigger inside full quoted string', () => {
      const result = parseLineForCompletion('      message: "@"');
      expect(result?.matchType).toBe('at');
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

    it('should parse incomplete key in complete mustache expression', () => {
      const result = parseLineForCompletion('message: "{{ consts.a }}"');
      expect(result?.matchType).toBe('variable-complete');
      expect(result?.fullKey).toBe('consts.a');
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

  describe('foreach-variable scenarios', () => {
    it('should parse foreach variable with simple key', () => {
      const result = parseLineForCompletion('foreach: items');
      expect(result?.matchType).toBe('foreach-variable');
      expect(result?.fullKey).toBe('items');
      expect(result?.match).toBeNull();
      expect((result as ForeachVariableLineParseResult)?.pathSegments).toEqual(['items']);
      expect((result as ForeachVariableLineParseResult)?.lastPathSegment).toBe('items');
    });

    it('should parse foreach variable with dotted path', () => {
      const result = parseLineForCompletion('foreach: steps.getUsers.output.users');
      expect(result?.matchType).toBe('foreach-variable');
      expect(result?.fullKey).toBe('steps.getUsers.output.users');
      expect((result as ForeachVariableLineParseResult)?.pathSegments).toEqual([
        'steps',
        'getUsers',
        'output',
        'users',
      ]);
      expect((result as ForeachVariableLineParseResult)?.lastPathSegment).toBe('users');
    });

    it('should parse foreach variable with trailing space', () => {
      const result = parseLineForCompletion('foreach: items ');
      expect(result?.matchType).toBe('foreach-variable');
      expect(result?.fullKey).toBe(''); // Trailing space means last word is empty
    });

    it('should parse foreach variable with partial path', () => {
      const result = parseLineForCompletion('foreach: steps.get');
      expect(result?.matchType).toBe('foreach-variable');
      expect(result?.fullKey).toBe('steps.get');
      expect((result as ForeachVariableLineParseResult)?.pathSegments).toEqual(['steps', 'get']);
      expect((result as ForeachVariableLineParseResult)?.lastPathSegment).toBe('get');
    });

    it('should parse foreach variable with trailing dot', () => {
      const result = parseLineForCompletion('foreach: steps.');
      expect(result?.matchType).toBe('foreach-variable');
      expect(result?.fullKey).toBe('steps');
      expect((result as ForeachVariableLineParseResult)?.pathSegments).toEqual(['steps']);
      expect((result as ForeachVariableLineParseResult)?.lastPathSegment).toBeNull();
    });

    it('should parse foreach variable with indentation', () => {
      const result = parseLineForCompletion('    foreach: data.items');
      expect(result?.matchType).toBe('foreach-variable');
      expect(result?.fullKey).toBe('data.items');
    });

    it('should parse foreach variable with tabs', () => {
      const result = parseLineForCompletion('\t\tforeach: collection');
      expect(result?.matchType).toBe('foreach-variable');
      expect(result?.fullKey).toBe('collection');
    });

    it('should parse empty foreach variable', () => {
      const result = parseLineForCompletion('foreach: ');
      expect(result?.matchType).toBe('foreach-variable');
      expect(result?.fullKey).toBe('');
      expect((result as ForeachVariableLineParseResult)?.pathSegments).toBeNull(); // parsePath returns null for empty string
      expect((result as ForeachVariableLineParseResult)?.lastPathSegment).toBeNull();
    });

    it('should parse foreach variable with extra spaces around colon', () => {
      const result = parseLineForCompletion('  foreach  :  items.data');
      // This test expects exact matching of "foreach:" which doesn't work with spaces
      // The implementation looks for "foreach:" without spaces
      expect(result).toBeNull();
    });
  });

  describe('connector-id scenarios', () => {
    it('should parse connector-id with value', () => {
      const line = 'connector-id: my-connector-123';
      const result = parseLineForCompletion(line);
      expect(result?.matchType).toBe('connector-id');
      expect(result?.fullKey).toBe('my-connector-123');
      expect(result?.match).toBeTruthy();
      expect((result as ConnectorIdLineParseResult)?.valueStartIndex).toEqual(
        line.indexOf('connector-id: ') + 'connector-id: '.length
      );
    });

    it('should parse empty connector-id', () => {
      const result = parseLineForCompletion('connector-id: ');
      expect(result?.matchType).toBe('connector-id');
      expect(result?.fullKey).toBe('');
    });

    it('should parse connector-id with partial value', () => {
      const result = parseLineForCompletion('connector-id: slack-');
      expect(result?.matchType).toBe('connector-id');
      expect(result?.fullKey).toBe('slack-');
    });

    it('should parse connector-id with indentation', () => {
      const result = parseLineForCompletion('  connector-id: webhook-prod');
      expect(result?.matchType).toBe('connector-id');
      expect(result?.fullKey).toBe('webhook-prod');
    });

    it('should parse connector-id with tabs', () => {
      const result = parseLineForCompletion('\tconnector-id:\tmy-webhook');
      expect(result?.matchType).toBe('connector-id');
      expect(result?.fullKey).toBe('my-webhook');
    });

    it('should parse connector-id with leading tabs', () => {
      const line = '    connector-id: security-demos';
      const result = parseLineForCompletion(line);
      expect(result?.matchType).toBe('connector-id');
      expect(result?.fullKey).toBe('security-demos');
      expect((result as ConnectorIdLineParseResult)?.valueStartIndex).toEqual(
        line.indexOf('connector-id: ') + 'connector-id: '.length
      );
    });

    it('should parse connector-id with extra spaces', () => {
      const line = 'connector-id:   email-service  ';
      const result = parseLineForCompletion(line);
      expect(result?.matchType).toBe('connector-id');
      expect(result?.fullKey).toBe('email-service');
      expect((result as ConnectorIdLineParseResult)?.valueStartIndex).toEqual(
        line.indexOf('connector-id: ') + 'connector-id: '.length
      );
    });

    it('should parse connector-id with complex name', () => {
      const result = parseLineForCompletion('connector-id: prod_webhook_v2.1-beta');
      expect(result?.matchType).toBe('connector-id');
      expect(result?.fullKey).toBe('prod_webhook_v2.1-beta');
    });
  });

  describe('type scenarios', () => {
    it('should parse type with simple value', () => {
      const result = parseLineForCompletion('type: webhook');
      expect(result?.matchType).toBe('type');
      expect(result?.fullKey).toBe('webhook');
      expect(result?.match).toBeTruthy();
    });

    it('should parse type with - prefix', () => {
      const line = '- type: action';
      const result = parseLineForCompletion(line);
      expect(result?.matchType).toBe('type');
      expect(result?.fullKey).toBe('action');
      expect((result as TypeLineParseResult)?.valueStartIndex).toBe(
        line.indexOf('type: ') + 'type: '.length
      );
    });

    it('should parse empty type', () => {
      const result = parseLineForCompletion('type: ');
      expect(result?.matchType).toBe('type');
      expect(result?.fullKey).toBe('');
    });

    it('should parse empty type with - prefix', () => {
      const result = parseLineForCompletion('  - type:  ');
      expect(result?.matchType).toBe('type');
      expect(result?.fullKey).toBe('');
    });

    it('should parse type with partial value', () => {
      const result = parseLineForCompletion('type: web');
      expect(result?.matchType).toBe('type');
      expect(result?.fullKey).toBe('web');
    });

    it('should parse type with quotes (removes them)', () => {
      const line = 'type: "webhook"';
      const result = parseLineForCompletion(line);
      expect(result?.matchType).toBe('type');
      expect(result?.fullKey).toBe('webhook');
      expect((result as TypeLineParseResult)?.valueStartIndex).toBe(
        line.indexOf('type: ') + 'type: '.length
      );
    });

    it('should parse type with single quotes (removes them)', () => {
      const result = parseLineForCompletion("type: 'filter'");
      expect(result?.matchType).toBe('type');
      expect(result?.fullKey).toBe('filter');
    });

    it('should not parse type case-insensitive', () => {
      const result = parseLineForCompletion('Type: webhook');
      expect(result).toBeNull();
    });

    it('should parse type with indentation', () => {
      const line = '    type: script';
      const result = parseLineForCompletion(line);
      expect(result?.matchType).toBe('type');
      expect(result?.fullKey).toBe('script');
      expect((result as TypeLineParseResult)?.valueStartIndex).toBe(
        line.indexOf('type: ') + 'type: '.length
      );
    });

    it('should parse type with tabs', () => {
      const result = parseLineForCompletion('\t\ttype:\twebhook');
      expect(result?.matchType).toBe('type');
      expect(result?.fullKey).toBe('webhook');
    });

    it('should not parse type when there are spaces before the colon', () => {
      const result = parseLineForCompletion('  type  :   filter  ');
      expect(result).toBeNull();
    });

    it('should parse type with hyphenated value', () => {
      const result = parseLineForCompletion('type: send-email');
      expect(result?.matchType).toBe('type');
      expect(result?.fullKey).toBe('send-email');
    });

    it('should parse type with underscore value', () => {
      const result = parseLineForCompletion('type: log_message');
      expect(result?.matchType).toBe('type');
      expect(result?.fullKey).toBe('log_message');
    });

    it('should not parse type with mixed case in keyword', () => {
      const result = parseLineForCompletion('  TyPe: webhook');
      expect(result).toBeNull();
    });
  });

  describe('timezone scenarios', () => {
    it('should parse timezone with tzid field', () => {
      const result = parseLineForCompletion('tzid: America/New_York');
      expect(result?.matchType).toBe('timezone');
      expect(result?.fullKey).toBe('America/New_York');
      expect(result?.match).toBeTruthy();
    });

    it('should parse timezone with timezone field', () => {
      const result = parseLineForCompletion('timezone: Europe/London');
      expect(result?.matchType).toBe('timezone');
      expect(result?.fullKey).toBe('Europe/London');
    });

    it('should parse empty timezone', () => {
      const result = parseLineForCompletion('timezone: ');
      expect(result?.matchType).toBe('timezone');
      expect(result?.fullKey).toBe('');
    });

    it('should parse partial timezone', () => {
      const result = parseLineForCompletion('tzid: America/');
      expect(result?.matchType).toBe('timezone');
      expect(result?.fullKey).toBe('America/');
    });

    it('should parse timezone with indentation', () => {
      const result = parseLineForCompletion('  timezone: Asia/Tokyo');
      expect(result?.matchType).toBe('timezone');
      expect(result?.fullKey).toBe('Asia/Tokyo');
    });

    it('should parse timezone with tabs', () => {
      const result = parseLineForCompletion('\ttzid:\tPacific/Auckland');
      expect(result?.matchType).toBe('timezone');
      expect(result?.fullKey).toBe('Pacific/Auckland');
    });

    it('should parse timezone with extra spaces', () => {
      const result = parseLineForCompletion('  timezone  :   UTC  ');
      expect(result?.matchType).toBe('timezone');
      expect(result?.fullKey).toBe('UTC');
    });

    it('should parse timezone with underscore format', () => {
      const result = parseLineForCompletion('tzid: America/Los_Angeles');
      expect(result?.matchType).toBe('timezone');
      expect(result?.fullKey).toBe('America/Los_Angeles');
    });

    it('should parse timezone with offset format', () => {
      const result = parseLineForCompletion('timezone: GMT+5');
      expect(result?.matchType).toBe('timezone');
      expect(result?.fullKey).toBe('GMT+5');
    });

    it('should parse timezone with complex path', () => {
      const result = parseLineForCompletion('tzid: America/Argentina/Buenos_Aires');
      expect(result?.matchType).toBe('timezone');
      expect(result?.fullKey).toBe('America/Argentina/Buenos_Aires');
    });

    it('should parse short timezone code', () => {
      const result = parseLineForCompletion('timezone: PST');
      expect(result?.matchType).toBe('timezone');
      expect(result?.fullKey).toBe('PST');
    });

    it('should parse timezone with leading/trailing whitespace', () => {
      const result = parseLineForCompletion('tzid:   Europe/Paris   ');
      expect(result?.matchType).toBe('timezone');
      expect(result?.fullKey).toBe('Europe/Paris');
    });
  });

  describe('priority and edge cases', () => {
    it('should prioritize timezone over other patterns', () => {
      const result = parseLineForCompletion('timezone: {{ consts.tz }}');
      expect(result?.matchType).toBe('timezone');
      expect(result?.fullKey).toBe('{{ consts.tz }}');
    });

    it('should prioritize type over other patterns', () => {
      const result = parseLineForCompletion('type: {{ steps.getType }}');
      expect(result?.matchType).toBe('type');
      expect(result?.fullKey).toBe('{{ steps.getType }}');
    });

    it('should prioritize connector-id over other patterns', () => {
      const result = parseLineForCompletion('connector-id: {{ consts.connector }}');
      expect(result?.matchType).toBe('connector-id');
      expect(result?.fullKey).toBe('{{ consts.connector }}');
    });

    it('should handle type with no colon space', () => {
      const result = parseLineForCompletion('type:webhook');
      expect(result?.matchType).toBe('type');
      expect(result?.fullKey).toBe('webhook');
    });

    it('should handle timezone with no colon space', () => {
      const result = parseLineForCompletion('timezone:UTC');
      expect(result?.matchType).toBe('timezone');
      expect(result?.fullKey).toBe('UTC');
    });

    it('should handle connector-id with no colon space', () => {
      const result = parseLineForCompletion('connector-id:my-connector');
      expect(result?.matchType).toBe('connector-id');
      expect(result?.fullKey).toBe('my-connector');
    });

    it('should not match type in middle of line', () => {
      const result = parseLineForCompletion('some text type: webhook more text');
      expect(result).toBeNull();
    });

    it('should not match timezone in middle of line', () => {
      const result = parseLineForCompletion('some text timezone: UTC more text');
      expect(result).toBeNull();
    });

    it('should not match connector-id in middle of line', () => {
      const result = parseLineForCompletion('some text connector-id: test more text');
      expect(result).toBeNull();
    });
  });
});
