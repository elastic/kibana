/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../query';
import { printAst } from '../../debug/print_ast';
import type { ESQLCommand, ESQLMap, ESQLMapEntry, ESQLParens } from '../../types';
import { Walker } from '../../walker';

describe('PROMQL <params>... ( <query> )', () => {
  describe('correctly formatted', () => {
    it('parses basic PROMQL command with single param', () => {
      const text = `FROM index | PROMQL start "2024-01-01" (up{job="prometheus"})`;
      const query = EsqlQuery.fromSrc(text);

      expect(query.ast.commands[1]).toMatchObject({
        type: 'command',
        name: 'promql',
        incomplete: false,
      });
      expect('\n' + printAst(query.ast.commands[1])).toBe(`
command 13-60 "promql"
├─ map 20-37
│  └─ map-entry 20-37
│     ├─ identifier 20-24 "start"
│     └─ literal 26-37 ""2024-01-01""
└─ parens 39-60
   └─ unknown 40-59 "unknown"`);
    });

    it('parses PROMQL command with multiple params', () => {
      const text = `FROM index | PROMQL start "2024-01-01" end "2024-01-02" step "1m" (up{job="prometheus"})`;
      const query = EsqlQuery.fromSrc(text);
      const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;

      expect(promqlCmd).toMatchObject({
        type: 'command',
        name: 'promql',
        incomplete: false,
      });

      // Should have 1 map (with 3 entries) + 1 query string
      expect(promqlCmd.args.length).toBe(2);

      // First arg is the params map
      const paramsMap = promqlCmd.args[0] as ESQLMap;
      expect(paramsMap.type).toBe('map');
      expect(paramsMap.representation).toBe('listpairs');
      expect(paramsMap.entries.length).toBe(3);

      expect('\n' + printAst(query.ast.commands[1])).toBe(`
command 13-87 "promql"
├─ map 20-64
│  ├─ map-entry 20-37
│  │  ├─ identifier 20-24 "start"
│  │  └─ literal 26-37 ""2024-01-01""
│  ├─ map-entry 39-54
│  │  ├─ identifier 39-41 "end"
│  │  └─ literal 43-54 ""2024-01-02""
│  └─ map-entry 56-64
│     ├─ identifier 56-59 "step"
│     └─ literal 61-64 ""1m""
└─ parens 66-87
   └─ unknown 67-86 "unknown"`);
    });

    describe('<params>... map', () => {
      it('parses param name-value pairs as map entries', () => {
        const text = `FROM index | PROMQL start "2024-01-01" (up)`;
        const query = EsqlQuery.fromSrc(text);
        const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;

        const paramsMap = promqlCmd.args[0] as ESQLMap;
        expect(paramsMap.type).toBe('map');
        expect(paramsMap.representation).toBe('listpairs');

        const startEntry = paramsMap.entries.find(
          (entry): entry is ESQLMapEntry =>
            entry.key.type === 'identifier' && entry.key.name === 'start'
        );

        expect(startEntry).toBeDefined();
        expect(startEntry?.value).toMatchObject({
          type: 'literal',
          literalType: 'keyword',
          valueUnquoted: '2024-01-01',
        });
      });

      it('parses unquoted identifier param values', () => {
        const text = `FROM index | PROMQL step 1m (up)`;
        const query = EsqlQuery.fromSrc(text);
        const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;

        const paramsMap = promqlCmd.args[0] as ESQLMap;
        const stepEntry = paramsMap.entries.find(
          (entry): entry is ESQLMapEntry =>
            entry.key.type === 'identifier' && entry.key.name === 'step'
        );

        expect(stepEntry).toBeDefined();
        expect(stepEntry?.value).toMatchObject({
          type: 'identifier',
          name: '1m',
        });
      });

      it('parses PROMQL with quoted identifier param names', () => {
        const text = 'FROM index | PROMQL `start-time` "2024-01-01" (up)';
        const query = EsqlQuery.fromSrc(text);
        const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;

        const paramsMap = promqlCmd.args[0] as ESQLMap;
        const entry = paramsMap.entries[0];

        expect(entry).toBeDefined();
        expect(entry.key).toMatchObject({
          type: 'identifier',
          name: 'start-time',
        });
      });
    });

    describe('PromQL embedded <query>', () => {
      it('parses the PromQL query parens', () => {
        const text = `FROM index | PROMQL start "2024-01-01" (up{job="prometheus"})`;
        const query = EsqlQuery.fromSrc(text);
        const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;
        const parens = promqlCmd.args[promqlCmd.args.length - 1] as ESQLParens;

        expect(text.slice(parens.location!.min, parens.location!.max + 1)).toContain(
          '(up{job="prometheus"})'
        );
      });

      it('the "unknown" node carries correct .text for pretty-printing', () => {
        const text = `FROM index | PROMQL start "2024-01-01" (up{job="prometheus"})`;
        const query = EsqlQuery.fromSrc(text);
        const unk = Walker.match(query.ast, { type: 'unknown' })!;

        expect(unk.text).toBe('up{job="prometheus"}');
      });

      it('parses complex PromQL query with nested parentheses', () => {
        const text = `FROM index | PROMQL start now (sum(rate(http_requests_total{job="api"}[5m])) by (status))`;
        const query = EsqlQuery.fromSrc(text);
        const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;
        const parens = promqlCmd.args[promqlCmd.args.length - 1] as ESQLParens;

        expect(text.slice(parens.location!.min, parens.location!.max + 1)).toContain(
          '(sum(rate(http_requests_total{job="api"}[5m])) by (status))'
        );
      });

      it('parses empty PromQL query', () => {
        const text = `FROM index | PROMQL start "2024-01-01" ()`;
        const query = EsqlQuery.fromSrc(text);
        const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;

        expect(promqlCmd).toMatchObject({
          type: 'command',
          name: 'promql',
          incomplete: true,
        });
      });
    });
  });

  describe('incorrectly formatted', () => {
    it('reports error on missing params', () => {
      const text = `FROM index | PROMQL (up)`;
      const { errors } = EsqlQuery.fromSrc(text);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('reports error on missing query parentheses', () => {
      const text = `FROM index | PROMQL start "2024-01-01"`;
      const { errors } = EsqlQuery.fromSrc(text);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('marks command as incomplete when missing closing paren', () => {
      const text = `FROM index | PROMQL start "2024-01-01" (up`;
      const query = EsqlQuery.fromSrc(text);
      const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;

      expect(promqlCmd.incomplete).toBe(true);
    });
  });

  describe('with parameters', () => {
    it('parses named parameters in param values', () => {
      const text = `FROM index | PROMQL start ?start_time (up)`;
      const query = EsqlQuery.fromSrc(text);
      const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;

      const paramsMap = promqlCmd.args[0] as ESQLMap;
      const startEntry = paramsMap.entries.find(
        (entry): entry is ESQLMapEntry =>
          entry.key.type === 'identifier' && entry.key.name === 'start'
      );

      expect(startEntry).toBeDefined();
      expect(startEntry?.value).toMatchObject({
        type: 'literal',
        literalType: 'param',
        paramType: 'named',
        value: 'start_time',
      });
    });

    it('parses positional parameters in param values', () => {
      const text = `FROM index | PROMQL start ?1 (up)`;
      const query = EsqlQuery.fromSrc(text);
      const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;

      const paramsMap = promqlCmd.args[0] as ESQLMap;
      const startEntry = paramsMap.entries.find(
        (entry): entry is ESQLMapEntry =>
          entry.key.type === 'identifier' && entry.key.name === 'start'
      );

      expect(startEntry).toBeDefined();
      expect(startEntry?.value).toMatchObject({
        type: 'literal',
        literalType: 'param',
        paramType: 'positional',
        value: 1,
      });
    });
  });
});
