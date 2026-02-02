/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../composer/query';
import type {
  ESQLCommand,
  ESQLMap,
  ESQLMapEntry,
  ESQLParens,
  ESQLBinaryExpression,
  ESQLUnknownItem,
  ESQLAstPromqlCommand,
} from '../../types';
import { Walker } from '../../ast/walker';
import { printAst } from '../../shared/debug';

/**
 * ```
 * PROMQL key=value key=value... (valueName =)? ( promqlQueryPart+ )
 * PROMQL key=value key=value... promqlQueryPart+
 * ```
 */
describe('PROMQL command', () => {
  describe('with parenthesized query: PROMQL params... ( query )', () => {
    describe('correctly formatted', () => {
      it('parses basic PROMQL command with single param', () => {
        const text = `PROMQL index=k8s (bytes_in)`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[0]).toMatchObject({
          type: 'command',
          name: 'promql',
          incomplete: false,
        });

        const promqlCmd = query.ast.commands[0] as ESQLAstPromqlCommand;
        expect(promqlCmd.args.length).toBe(2);

        // First arg is the params map
        const paramsMap = promqlCmd.args[0] as ESQLMap;
        expect(paramsMap).toBe(promqlCmd.params);
        expect(paramsMap.type).toBe('map');
        expect(paramsMap.representation).toBe('assignment');
        expect(paramsMap.entries.length).toBe(1);

        // Second arg is the query in parens
        const parens = promqlCmd.args[1] as ESQLParens;
        expect(parens.type).toBe('parens');
      });

      it('parses PROMQL command with multiple params', () => {
        const text = `PROMQL start="2024-01-01" end="2024-01-02" step="1m" (up{job="prometheus"})`;
        const query = EsqlQuery.fromSrc(text);
        const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;

        expect(promqlCmd).toMatchObject({
          type: 'command',
          name: 'promql',
          incomplete: false,
        });

        // Should have 1 map (with 3 entries) + 1 parens
        expect(promqlCmd.args.length).toBe(2);

        // First arg is the params map
        const paramsMap = promqlCmd.args[0] as ESQLMap;
        expect(paramsMap.type).toBe('map');
        expect(paramsMap.representation).toBe('assignment');
        expect(paramsMap.entries.length).toBe(3);
      });

      describe('<params> map with assignment syntax', () => {
        it('parses param name=value pairs as map entries', () => {
          const text = `PROMQL start="2024-01-01" (up)`;
          const query = EsqlQuery.fromSrc(text);
          const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;

          const paramsMap = promqlCmd.args[0] as ESQLMap;
          expect(paramsMap.type).toBe('map');
          expect(paramsMap.representation).toBe('assignment');

          const startEntry = paramsMap.entries.find(
            (entry): entry is ESQLMapEntry =>
              entry.key.type === 'identifier' && entry.key.name === 'start'
          );

          expect(startEntry).toBeDefined();
          expect(startEntry?.value).toMatchObject({
            type: 'identifier',
            name: '"2024-01-01"',
          });
        });

        it('parses unquoted identifier param values', () => {
          const text = `PROMQL index=k8s (up)`;
          const query = EsqlQuery.fromSrc(text);
          const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;

          const paramsMap = promqlCmd.args[0] as ESQLMap;
          const indexEntry = paramsMap.entries.find(
            (entry): entry is ESQLMapEntry =>
              entry.key.type === 'identifier' && entry.key.name === 'index'
          );

          expect(indexEntry).toBeDefined();
          expect(indexEntry?.value).toMatchObject({
            type: 'identifier',
            name: 'k8s',
          });
        });

        it('parses PROMQL with quoted identifier param names', () => {
          const text = 'PROMQL `start-time`="2024-01-01" (up)';
          const query = EsqlQuery.fromSrc(text);
          const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;

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
          const text = `PROMQL start="2024-01-01" (up{job="prometheus"})`;
          const query = EsqlQuery.fromSrc(text);
          const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;
          const parens = promqlCmd.args[promqlCmd.args.length - 1] as ESQLParens;

          expect(parens.type).toBe('parens');
          expect(text.slice(parens.location!.min, parens.location!.max + 1)).toContain(
            '(up{job="prometheus"})'
          );
        });

        it('the "unknown" node carries correct .text for pretty-printing', () => {
          const text = `PROMQL start="2024-01-01" (up{job="prometheus"})`;
          const query = EsqlQuery.fromSrc(text);
          const unk = Walker.match(query.ast, { type: 'unknown' })!;

          expect(unk.text).toBe('up{job="prometheus"}');
        });

        it('parses complex PromQL query with nested parentheses', () => {
          const text = `PROMQL index=k8s (sum(rate(http_requests_total{job="api"}[5m])) by (status))`;
          const query = EsqlQuery.fromSrc(text);
          const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;
          const parens = promqlCmd.args[promqlCmd.args.length - 1] as ESQLParens;

          expect(text.slice(parens.location!.min, parens.location!.max + 1)).toContain(
            '(sum(rate(http_requests_total{job="api"}[5m])) by (status))'
          );
        });

        it('parses empty PromQL query', () => {
          const text = `PROMQL start="2024-01-01" ()`;
          const query = EsqlQuery.fromSrc(text);
          const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;

          expect(promqlCmd).toMatchObject({
            type: 'command',
            name: 'promql',
            incomplete: true,
          });
        });
      });

      describe('ES|QL params', () => {
        it('parses named parameters in param values', () => {
          const text = `PROMQL start=?start_time (up)`;
          const query = EsqlQuery.fromSrc(text);
          const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;

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
          const text = `PROMQL start=?1 (up)`;
          const query = EsqlQuery.fromSrc(text);
          const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;

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

      describe('query name assignment: PROMQL params... result = ( query )', () => {
        it('parses query assignment to a variable', () => {
          const text = `PROMQL index=k8s result = (bytes_in)`;
          const query = EsqlQuery.fromSrc(text);
          const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;

          expect(promqlCmd).toMatchObject({
            type: 'command',
            name: 'promql',
            incomplete: false,
          });

          // Should have 1 map + 1 binary expression (assignment)
          expect(promqlCmd.args.length).toBe(2);

          // First arg is the params map
          const paramsMap = promqlCmd.args[0] as ESQLMap;
          expect(paramsMap.type).toBe('map');

          // Second arg is the assignment expression
          const assignExpr = promqlCmd.args[1] as ESQLBinaryExpression;
          expect(assignExpr.type).toBe('function');
          expect(assignExpr.subtype).toBe('binary-expression');
          expect(assignExpr.name).toBe('=');

          // Left side should be the variable name
          const leftArg = assignExpr.args[0];
          expect(leftArg).toMatchObject({
            type: 'identifier',
            name: 'result',
          });

          // Right side should be the parens with query
          const rightArg = assignExpr.args[1] as ESQLParens;
          expect(rightArg.type).toBe('parens');
        });

        it('parses quoted variable name in assignment', () => {
          const text = 'PROMQL index=k8s `my-result` = (bytes_in)';
          const query = EsqlQuery.fromSrc(text);
          const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;

          const assignExpr = promqlCmd.args[1] as ESQLBinaryExpression;
          const leftArg = assignExpr.args[0];
          expect(leftArg).toMatchObject({
            type: 'identifier',
            name: 'my-result',
          });
        });
      });

      describe('without parentheses: PROMQL params... queryParts', () => {
        it('parses PROMQL command without parentheses', () => {
          const text = `PROMQL index=k8s bytes_in`;
          const query = EsqlQuery.fromSrc(text);
          const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;

          expect(promqlCmd).toMatchObject({
            type: 'command',
            name: 'promql',
            incomplete: false,
          });

          // Should have 1 map + 1 unknown (query)
          expect(promqlCmd.args.length).toBe(2);

          // First arg is the params map
          const paramsMap = promqlCmd.args[0] as ESQLMap;
          expect(paramsMap.type).toBe('map');
          expect(paramsMap.entries[0].key).toMatchObject({
            type: 'identifier',
            name: 'index',
          });

          // Second arg is the query (unknown node, not wrapped in parens)
          const queryNode = promqlCmd.args[1] as ESQLUnknownItem;
          expect(queryNode.type).toBe('unknown');
          expect(queryNode.text).toBe('bytes_in');
        });

        it('parses complex query without parentheses', () => {
          const text = `PROMQL index=k8s sum(rate(http_requests_total[5m]))`;
          const query = EsqlQuery.fromSrc(text);
          const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;

          const queryNode = promqlCmd.args[1] as ESQLUnknownItem;
          expect(queryNode.type).toBe('unknown');
          expect(queryNode.text).toBe('sum(rate(http_requests_total[5m]))');
        });
      });

      describe('node positions (correctly extracts `.location` objects)', () => {
        it('PROMQL <query>', () => {
          const src = `PROMQL bytes_in`;
          const query = EsqlQuery.fromSrc(src);
          const snapshot = printAst(query.ast, {
            compact: true,
            src,
            printSrc: true,
          });

          expect('\n' + snapshot).toBe(`
query "PROMQL bytes_in"
└─ command "PROMQL bytes_in"
   └─ unknown "bytes_in"`);
        });

        it('PROMQL ( <query> )', () => {
          const src = `PROMQL ( bytes_in )`;
          const query = EsqlQuery.fromSrc(src);
          const snapshot = printAst(query.ast, {
            compact: true,
            src,
            printSrc: true,
          });

          expect('\n' + snapshot).toBe(`
query "PROMQL ( bytes_in )"
└─ command "PROMQL ( bytes_in )"
   └─ parens "( bytes_in )"
      └─ unknown "bytes_in"`);
        });

        it('PROMQL <name> = ( <query> )', () => {
          const src = `PROMQL result = ( bytes_in )`;
          const query = EsqlQuery.fromSrc(src);
          const snapshot = printAst(query.ast, {
            compact: true,
            src,
            printSrc: true,
          });

          expect('\n' + snapshot).toBe(`
query "PROMQL result = ( bytes_in )"
└─ command "PROMQL result = ( bytes_in )"
   └─ function "result = ( bytes_in )"
      ├─ identifier "result"
      └─ parens "( bytes_in )"
         └─ unknown "bytes_in"`);
        });

        it('PROMQL <key>=<value> <query>', () => {
          const src = `PROMQL hello = ?world bytes_in{job="prometheus"}`;
          const query = EsqlQuery.fromSrc(src);
          const snapshot = printAst(query.ast, {
            compact: true,
            src,
            printSrc: true,
          });

          expect('\n' + snapshot).toBe(`
query "PROMQL hello = ?world bytes_in{job="prometheus"}"
└─ command "PROMQL hello = ?world bytes_in{job="prometheus"}"
   ├─ map "hello = ?world"
   │  └─ map-entry "hello = ?world"
   │     ├─ identifier "hello"
   │     └─ literal "?world"
   └─ unknown "bytes_in{job="prometheus"}"`);
        });

        it('PROMQL <key1>=<value1> <key2>=<value2> name = ( <query> )', () => {
          const src = `PROMQL hello = ?world ?param = \`identifier\` \`the_name\` = (bytes_in{job="prometheus"})`;
          const query = EsqlQuery.fromSrc(src);
          const snapshot = printAst(query.ast, {
            compact: true,
            src,
            printSrc: true,
          });

          expect('\n' + snapshot).toBe(`
query "PROMQL hello = ?world ?param = \`identifier\` \`the_name\` = (bytes_in{job="prometheus"})"
└─ command "PROMQL hello = ?world ?param = \`identifier\` \`the_name\` = (bytes_in{job="prometheus"})"
   ├─ map "hello = ?world ?param = \`identifier\`"
   │  ├─ map-entry "hello = ?world"
   │  │  ├─ identifier "hello"
   │  │  └─ literal "?world"
   │  └─ map-entry "?param = \`identifier\`"
   │     ├─ literal "?param"
   │     └─ identifier "\`identifier\`"
   └─ function "\`the_name\` = (bytes_in{job="prometheus"})"
      ├─ identifier "\`the_name\`"
      └─ parens "(bytes_in{job="prometheus"})"
         └─ unknown "bytes_in{job="prometheus"}"`);
        });
      });
    });

    describe('incorrectly formatted', () => {
      it('marks command as incomplete when missing closing paren', () => {
        const text = `PROMQL start="2024-01-01" (up`;
        const query = EsqlQuery.fromSrc(text);
        const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;

        expect(promqlCmd.incomplete).toBe(true);
      });
    });
  });
});
