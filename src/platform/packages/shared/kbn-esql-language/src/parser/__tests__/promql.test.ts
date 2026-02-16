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
  ESQLAstPromqlCommand,
} from '../../types';
import { printAst } from '../../debug';

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

      describe('PROMQL <params>', () => {
        describe('index patterns', () => {
          describe('indexString only', () => {
            describe('UNQUOTED_IDENTIFIER', () => {
              it('single index as UNQUOTED_IDENTIFIER', () => {
                const text = 'PROMQL a = abc query';
                const query = EsqlQuery.fromSrc(text);
                const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;
                const paramsMap = promqlCmd.args[0] as ESQLMap;

                expect('\n' + printAst(paramsMap)).toBe(`
map 7-13
└─ map-entry 7-13
   ├─ identifier 7-7 "a"
   └─ list 11-13
      └─ source 11-13 "abc"
         └─ literal 11-13 ""abc""`);
              });

              it('single index as UNQUOTED_IDENTIFIER (starts with underscore)', () => {
                const text = 'PROMQL a = _abc query';
                const query = EsqlQuery.fromSrc(text);
                const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;
                const paramsMap = promqlCmd.args[0] as ESQLMap;

                expect('\n' + printAst(paramsMap)).toBe(`
map 7-14
└─ map-entry 7-14
   ├─ identifier 7-7 "a"
   └─ list 11-14
      └─ source 11-14 "_abc"
         └─ literal 11-14 ""_abc""`);
              });

              it('single index as UNQUOTED_IDENTIFIER (starts with ampersand)', () => {
                const text = 'PROMQL a = &abc query';
                const query = EsqlQuery.fromSrc(text);
                const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;
                const paramsMap = promqlCmd.args[0] as ESQLMap;

                expect('\n' + printAst(paramsMap)).toBe(`
map 7-14
└─ map-entry 7-14
   ├─ identifier 7-7 "a"
   └─ list 11-14
      └─ source 11-14 "&abc"
         └─ literal 11-14 ""&abc""`);
              });

              it('single param multiple index patterns as UNQUOTED_IDENTIFIER', () => {
                const text = 'PROMQL a = a, b, c query';
                const query = EsqlQuery.fromSrc(text);
                const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;
                const paramsMap = promqlCmd.args[0] as ESQLMap;

                expect('\n' + printAst(paramsMap)).toBe(`
map 7-17
└─ map-entry 7-17
   ├─ identifier 7-7 "a"
   └─ list 11-17
      ├─ source 11-11 "a"
      │  └─ literal 11-11 ""a""
      ├─ source 14-14 "b"
      │  └─ literal 14-14 ""b""
      └─ source 17-17 "c"
         └─ literal 17-17 ""c""`);
              });

              it('single param multiple index patterns of different types', () => {
                const text = 'PROMQL a = a, _b, &c query';
                const query = EsqlQuery.fromSrc(text);
                const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;
                const paramsMap = promqlCmd.args[0] as ESQLMap;

                expect('\n' + printAst(paramsMap)).toBe(`
map 7-19
└─ map-entry 7-19
   ├─ identifier 7-7 "a"
   └─ list 11-19
      ├─ source 11-11 "a"
      │  └─ literal 11-11 ""a""
      ├─ source 14-15 "_b"
      │  └─ literal 14-15 ""_b""
      └─ source 18-19 "&c"
         └─ literal 18-19 ""&c""`);
              });
            });

            describe('UNQUOTED_SOURCE', () => {
              it('single index as UNQUOTED_SOURCE', () => {
                const text = 'PROMQL a = /xy query';
                const query = EsqlQuery.fromSrc(text);
                const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;
                const paramsMap = promqlCmd.args[0] as ESQLMap;

                expect('\n' + printAst(paramsMap)).toBe(`
map 7-13
└─ map-entry 7-13
   ├─ identifier 7-7 "a"
   └─ list 11-13
      └─ source 11-13 "/xy"
         └─ literal 11-13 ""/xy""`);
              });

              it('two UNQUOTED_SOURCEs', () => {
                const text = 'PROMQL indices = /a, /b query';
                const query = EsqlQuery.fromSrc(text);
                const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;
                const paramsMap = promqlCmd.args[0] as ESQLMap;

                expect('\n' + printAst(paramsMap)).toBe(`
map 7-22
└─ map-entry 7-22
   ├─ identifier 7-13 "indices"
   └─ list 17-22
      ├─ source 17-18 "/a"
      │  └─ literal 17-18 ""/a""
      └─ source 21-22 "/b"
         └─ literal 21-22 ""/b""`);
              });
            });

            describe('QUOTED_STRING', () => {
              it('single index as QUOTED_STRING', () => {
                const text = 'PROMQL a = "str" query';
                const query = EsqlQuery.fromSrc(text);
                const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;
                const paramsMap = promqlCmd.args[0] as ESQLMap;

                expect('\n' + printAst(paramsMap)).toBe(`
map 7-15
└─ map-entry 7-15
   ├─ identifier 7-7 "a"
   └─ list 11-15
      └─ source 11-15 ""str""
         └─ literal 11-15 ""str""`);
              });

              it('two x two indices as QUOTED_STRINGs', () => {
                const text = 'PROMQL a = "str", "str2" b = "str3", "str4" query';
                const query = EsqlQuery.fromSrc(text);
                const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;
                const paramsMap = promqlCmd.args[0] as ESQLMap;

                expect('\n' + printAst(paramsMap)).toBe(`
map 7-42
├─ map-entry 7-23
│  ├─ identifier 7-7 "a"
│  └─ list 11-23
│     ├─ source 11-15 ""str""
│     │  └─ literal 11-15 ""str""
│     └─ source 18-23 ""str2""
│        └─ literal 18-23 ""str2""
└─ map-entry 25-42
   ├─ identifier 25-25 "b"
   └─ list 29-42
      ├─ source 29-34 ""str3""
      │  └─ literal 29-34 ""str3""
      └─ source 37-42 ""str4""
         └─ literal 37-42 ""str4""`);
              });
            });
          });

          describe('clusterString + indexString', () => {
            it('single index as UNQUOTED_IDENTIFIER', () => {
              const text = 'PROMQL name = cluster:index query';
              const query = EsqlQuery.fromSrc(text);
              const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;
              const paramsMap = promqlCmd.args[0] as ESQLMap;

              expect('\n' + printAst(paramsMap)).toBe(`
map 7-26
└─ map-entry 7-26
   ├─ identifier 7-10 "name"
   └─ list 14-26
      └─ source 14-26 "cluster:index"
         ├─ literal 14-20 ""cluster""
         └─ literal 22-26 ""index""`);
            });

            it('single index as UNQUOTED_SOURCE', () => {
              const text = 'PROMQL name = /a:/b query';
              const query = EsqlQuery.fromSrc(text);
              const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;
              const paramsMap = promqlCmd.args[0] as ESQLMap;

              expect('\n' + printAst(paramsMap)).toBe(`
map 7-18
└─ map-entry 7-18
   ├─ identifier 7-10 "name"
   └─ list 14-18
      └─ source 14-18 "/a:/b"
         ├─ literal 14-15 ""/a""
         └─ literal 17-18 ""/b""`);
            });
          });

          describe('indexString + selectorString', () => {
            it('single index as UNQUOTED_IDENTIFIER', () => {
              const text = 'PROMQL name = index::selector query';
              const query = EsqlQuery.fromSrc(text);
              const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;
              const paramsMap = promqlCmd.args[0] as ESQLMap;

              expect('\n' + printAst(paramsMap)).toBe(`
map 7-28
└─ map-entry 7-28
   ├─ identifier 7-10 "name"
   └─ list 14-28
      └─ source 14-28 "index::selector"
         ├─ literal 14-18 ""index""
         └─ literal 21-28 ""selector""`);
            });

            it('single index as UNQUOTED_SOURCE', () => {
              const text = 'PROMQL name = /index::/selector query';
              const query = EsqlQuery.fromSrc(text);
              const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;
              const paramsMap = promqlCmd.args[0] as ESQLMap;

              expect('\n' + printAst(paramsMap)).toBe(`
map 7-30
└─ map-entry 7-30
   ├─ identifier 7-10 "name"
   └─ list 14-30
      └─ source 14-30 "/index::/selector"
         ├─ literal 14-19 ""/index""
         └─ literal 22-30 ""/selector""`);
            });
          });
        });

        describe('identifiers', () => {
          it('single index as QUOTED_IDENTIFIER', () => {
            const text = 'PROMQL a = `ab.c` query';
            const query = EsqlQuery.fromSrc(text);
            const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;
            const paramsMap = promqlCmd.args[0] as ESQLMap;

            expect('\n' + printAst(paramsMap)).toBe(`
map 7-16
└─ map-entry 7-16
   ├─ identifier 7-7 "a"
   └─ identifier 11-16 "ab.c"`);
          });
        });

        describe('params', () => {
          it('single named param', () => {
            const text = 'PROMQL a = ?name query';
            const query = EsqlQuery.fromSrc(text);
            const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;
            const paramsMap = promqlCmd.args[0] as ESQLMap;

            expect('\n' + printAst(paramsMap)).toBe(`
map 7-15
└─ map-entry 7-15
   ├─ identifier 7-7 "a"
   └─ literal 11-15 ?name`);
          });

          it('two positional params', () => {
            const text = 'PROMQL a = ?0 b = ?1 query';
            const query = EsqlQuery.fromSrc(text);
            const promqlCmd = query.ast.commands[0] as ESQLCommand<'promql'>;
            const paramsMap = promqlCmd.args[0] as ESQLMap;

            expect('\n' + printAst(paramsMap)).toBe(`
map 7-19
├─ map-entry 7-12
│  ├─ identifier 7-7 "a"
│  └─ literal 11-12 ?0
└─ map-entry 14-19
   ├─ identifier 14-14 "b"
   └─ literal 18-19 ?1`);
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
