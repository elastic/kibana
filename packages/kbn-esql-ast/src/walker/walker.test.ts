/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAstAndSyntaxErrors } from '../ast_parser';
import {
  ESQLColumn,
  ESQLCommand,
  ESQLCommandMode,
  ESQLCommandOption,
  ESQLFunction,
  ESQLLiteral,
  ESQLSource,
  ESQLList,
  ESQLTimeInterval,
  ESQLInlineCast,
  ESQLUnknownItem,
} from '../types';
import { walk, Walker } from './walker';

test('can walk all functions', () => {
  const { ast } = getAstAndSyntaxErrors('METRICS index a(b(c(foo)))');
  const functions: string[] = [];

  walk(ast, {
    visitFunction: (fn) => functions.push(fn.name),
  });

  expect(functions.sort()).toStrictEqual(['a', 'b', 'c']);
});

test('can find assignment expression', () => {
  const query = 'METRICS source var0 = bucket(bytes, 1 hour)';
  const { ast } = getAstAndSyntaxErrors(query);
  const functions: ESQLFunction[] = [];

  Walker.walk(ast, {
    visitFunction: (fn) => {
      if (fn.name === '=') {
        functions.push(fn);
      }
    },
  });

  expect(functions.length).toBe(1);
  expect(functions[0].name).toBe('=');
  expect(functions[0].args.length).toBe(2);
  expect((functions[0].args[0] as any).name).toBe('var0');
});

describe('structurally can walk all nodes', () => {
  describe('commands', () => {
    test('can visit a single source command', () => {
      const { ast } = getAstAndSyntaxErrors('FROM index');
      const commands: ESQLCommand[] = [];

      walk(ast, {
        visitCommand: (cmd) => commands.push(cmd),
      });

      expect(commands.map(({ name }) => name).sort()).toStrictEqual(['from']);
    });

    test('can visit all commands', () => {
      const { ast } = getAstAndSyntaxErrors('FROM index | STATS a = 123 | WHERE 123 | LIMIT 10');
      const commands: ESQLCommand[] = [];

      walk(ast, {
        visitCommand: (cmd) => commands.push(cmd),
      });

      expect(commands.map(({ name }) => name).sort()).toStrictEqual([
        'from',
        'limit',
        'stats',
        'where',
      ]);
    });

    describe('command options', () => {
      test('can visit command options', () => {
        const { ast } = getAstAndSyntaxErrors('FROM index METADATA _index');
        const options: ESQLCommandOption[] = [];

        walk(ast, {
          visitCommandOption: (opt) => options.push(opt),
        });

        expect(options.length).toBe(1);
        expect(options[0].name).toBe('metadata');
      });
    });

    describe('command mode', () => {
      test('visits "mode" nodes', () => {
        const { ast } = getAstAndSyntaxErrors('FROM index | ENRICH a:b');
        const options: ESQLCommandMode[] = [];

        walk(ast, {
          visitCommandMode: (opt) => options.push(opt),
        });

        expect(options.length).toBe(1);
        expect(options[0].name).toBe('a');
      });
    });

    describe('expressions', () => {
      describe('sources', () => {
        test('iterates through a single source', () => {
          const { ast } = getAstAndSyntaxErrors('FROM index');
          const sources: ESQLSource[] = [];

          walk(ast, {
            visitSource: (opt) => sources.push(opt),
          });

          expect(sources.length).toBe(1);
          expect(sources[0].name).toBe('index');
        });

        test('iterates through all sources', () => {
          const { ast } = getAstAndSyntaxErrors('METRICS index, index2, index3, index4');
          const sources: ESQLSource[] = [];

          walk(ast, {
            visitSource: (opt) => sources.push(opt),
          });

          expect(sources.length).toBe(4);
          expect(sources.map(({ name }) => name).sort()).toEqual([
            'index',
            'index2',
            'index3',
            'index4',
          ]);
        });
      });

      describe('columns', () => {
        test('can through a single column', () => {
          const query = 'ROW x = 1';
          const { ast } = getAstAndSyntaxErrors(query);
          const columns: ESQLColumn[] = [];

          walk(ast, {
            visitColumn: (node) => columns.push(node),
          });

          expect(columns).toMatchObject([
            {
              type: 'column',
              name: 'x',
            },
          ]);
        });

        test('can walk through multiple columns', () => {
          const query = 'FROM index | STATS a = 123, b = 456';
          const { ast } = getAstAndSyntaxErrors(query);
          const columns: ESQLColumn[] = [];

          walk(ast, {
            visitColumn: (node) => columns.push(node),
          });

          expect(columns).toMatchObject([
            {
              type: 'column',
              name: 'a',
            },
            {
              type: 'column',
              name: 'b',
            },
          ]);
        });
      });

      describe('literals', () => {
        test('can walk a single literal', () => {
          const query = 'ROW x = 1';
          const { ast } = getAstAndSyntaxErrors(query);
          const columns: ESQLLiteral[] = [];

          walk(ast, {
            visitLiteral: (node) => columns.push(node),
          });

          expect(columns).toMatchObject([
            {
              type: 'literal',
              name: '1',
            },
          ]);
        });

        test('can walk through all literals', () => {
          const query = 'FROM index | STATS a = 123, b = "foo", c = true AND false';
          const { ast } = getAstAndSyntaxErrors(query);
          const columns: ESQLLiteral[] = [];

          walk(ast, {
            visitLiteral: (node) => columns.push(node),
          });

          expect(columns).toMatchObject([
            {
              type: 'literal',
              literalType: 'number',
              name: '123',
            },
            {
              type: 'literal',
              literalType: 'string',
              name: '"foo"',
            },
            {
              type: 'literal',
              literalType: 'boolean',
              name: 'true',
            },
            {
              type: 'literal',
              literalType: 'boolean',
              name: 'false',
            },
          ]);
        });

        test('can walk through literals inside functions', () => {
          const query = 'FROM index | STATS f(1, "2", g(true) + false, h(j(k(3.14))))';
          const { ast } = getAstAndSyntaxErrors(query);
          const columns: ESQLLiteral[] = [];

          walk(ast, {
            visitLiteral: (node) => columns.push(node),
          });

          expect(columns).toMatchObject([
            {
              type: 'literal',
              literalType: 'number',
              name: '1',
            },
            {
              type: 'literal',
              literalType: 'string',
              name: '"2"',
            },
            {
              type: 'literal',
              literalType: 'boolean',
              name: 'true',
            },
            {
              type: 'literal',
              literalType: 'boolean',
              name: 'false',
            },
            {
              type: 'literal',
              literalType: 'number',
              name: '3.14',
            },
          ]);
        });
      });

      describe('list literals', () => {
        describe('numeric', () => {
          test('can walk a single numeric list literal', () => {
            const query = 'ROW x = [1, 2]';
            const { ast } = getAstAndSyntaxErrors(query);
            const lists: ESQLList[] = [];

            walk(ast, {
              visitListLiteral: (node) => lists.push(node),
            });

            expect(lists).toMatchObject([
              {
                type: 'list',
                values: [
                  {
                    type: 'literal',
                    literalType: 'number',
                    name: '1',
                  },
                  {
                    type: 'literal',
                    literalType: 'number',
                    name: '2',
                  },
                ],
              },
            ]);
          });

          test('can walk plain literals inside list literal', () => {
            const query = 'ROW x = [1, 2] + [3.3]';
            const { ast } = getAstAndSyntaxErrors(query);
            const lists: ESQLList[] = [];
            const literals: ESQLLiteral[] = [];

            walk(ast, {
              visitListLiteral: (node) => lists.push(node),
              visitLiteral: (node) => literals.push(node),
            });

            expect(lists).toMatchObject([
              {
                type: 'list',
                values: [
                  {
                    type: 'literal',
                    literalType: 'number',
                    name: '1',
                  },
                  {
                    type: 'literal',
                    literalType: 'number',
                    name: '2',
                  },
                ],
              },
              {
                type: 'list',
                values: [
                  {
                    type: 'literal',
                    literalType: 'number',
                    name: '3.3',
                  },
                ],
              },
            ]);
            expect(literals).toMatchObject([
              {
                type: 'literal',
                literalType: 'number',
                name: '1',
              },
              {
                type: 'literal',
                literalType: 'number',
                name: '2',
              },
              {
                type: 'literal',
                literalType: 'number',
                name: '3.3',
              },
            ]);
          });
        });

        describe('boolean', () => {
          test('can walk a single numeric list literal', () => {
            const query = 'ROW x = [true, false]';
            const { ast } = getAstAndSyntaxErrors(query);
            const lists: ESQLList[] = [];

            walk(ast, {
              visitListLiteral: (node) => lists.push(node),
            });

            expect(lists).toMatchObject([
              {
                type: 'list',
                values: [
                  {
                    type: 'literal',
                    literalType: 'boolean',
                    name: 'true',
                  },
                  {
                    type: 'literal',
                    literalType: 'boolean',
                    name: 'false',
                  },
                ],
              },
            ]);
          });

          test('can walk plain literals inside list literal', () => {
            const query = 'ROW x = [false, false], b([true, true, true])';
            const { ast } = getAstAndSyntaxErrors(query);
            const lists: ESQLList[] = [];
            const literals: ESQLLiteral[] = [];

            walk(ast, {
              visitListLiteral: (node) => lists.push(node),
              visitLiteral: (node) => literals.push(node),
            });

            expect(lists).toMatchObject([
              {
                type: 'list',
              },
              {
                type: 'list',
              },
            ]);
            expect(literals).toMatchObject([
              {
                type: 'literal',
                literalType: 'boolean',
                name: 'false',
              },
              {
                type: 'literal',
                literalType: 'boolean',
                name: 'false',
              },
              {
                type: 'literal',
                literalType: 'boolean',
                name: 'true',
              },
              {
                type: 'literal',
                literalType: 'boolean',
                name: 'true',
              },
              {
                type: 'literal',
                literalType: 'boolean',
                name: 'true',
              },
            ]);
          });
        });

        describe('string', () => {
          test('can walk string literals', () => {
            const query = 'ROW x = ["a", "b"], b(["c", "d", "e"])';
            const { ast } = getAstAndSyntaxErrors(query);
            const lists: ESQLList[] = [];
            const literals: ESQLLiteral[] = [];

            walk(ast, {
              visitListLiteral: (node) => lists.push(node),
              visitLiteral: (node) => literals.push(node),
            });

            expect(lists).toMatchObject([
              {
                type: 'list',
              },
              {
                type: 'list',
              },
            ]);
            expect(literals).toMatchObject([
              {
                type: 'literal',
                literalType: 'string',
                name: '"a"',
              },
              {
                type: 'literal',
                literalType: 'string',
                name: '"b"',
              },
              {
                type: 'literal',
                literalType: 'string',
                name: '"c"',
              },
              {
                type: 'literal',
                literalType: 'string',
                name: '"d"',
              },
              {
                type: 'literal',
                literalType: 'string',
                name: '"e"',
              },
            ]);
          });
        });
      });

      describe('time interval', () => {
        test('can visit time interval nodes', () => {
          const query = 'FROM index | STATS a = 123 BY 1h';
          const { ast } = getAstAndSyntaxErrors(query);

          const intervals: ESQLTimeInterval[] = [];

          walk(ast, {
            visitTimeIntervalLiteral: (node) => intervals.push(node),
          });

          expect(intervals).toMatchObject([
            {
              type: 'timeInterval',
              quantity: 1,
              unit: 'h',
            },
          ]);
        });
      });

      describe('cast expression', () => {
        test('can visit cast expression', () => {
          const query = 'FROM index | STATS a = 123::number';
          const { ast } = getAstAndSyntaxErrors(query);

          const casts: ESQLInlineCast[] = [];

          walk(ast, {
            visitInlineCast: (node) => casts.push(node),
          });

          expect(casts).toMatchObject([
            {
              type: 'inlineCast',
              castType: 'number',
              value: {
                type: 'literal',
                literalType: 'number',
                value: 123,
              },
            },
          ]);
        });
      });
    });
  });

  describe('unknown nodes', () => {
    test('can iterate through "unknown" nodes', () => {
      const { ast } = getAstAndSyntaxErrors('FROM index');
      let source: ESQLSource | undefined;

      walk(ast, {
        visitSource: (src) => (source = src),
      });

      (source! as any).type = 'unknown';

      const unknowns: ESQLUnknownItem[] = [];

      walk(ast, {
        visitUnknown: (node) => unknowns.push(node),
      });

      expect(unknowns).toMatchObject([
        {
          type: 'unknown',
        },
      ]);
    });
  });
});

describe('Walker.commands()', () => {
  test('can collect all commands', () => {
    const { ast } = getAstAndSyntaxErrors('FROM index | STATS a = 123 | WHERE 123 | LIMIT 10');
    const commands = Walker.commands(ast);

    expect(commands.map(({ name }) => name).sort()).toStrictEqual([
      'from',
      'limit',
      'stats',
      'where',
    ]);
  });
});

describe('Walker.params', () => {
  test('can collect all params', () => {
    const query = 'ROW x = ?';
    const { ast } = getAstAndSyntaxErrors(query);
    const params = Walker.params(ast);

    expect(params).toMatchObject([
      {
        type: 'literal',
        literalType: 'param',
        paramType: 'unnamed',
      },
    ]);
  });

  test('can collect all params from grouping functions', () => {
    const query = 'ROW x=1, time=2024-07-10 | stats z = avg(x) by bucket(time, 20, ?start,?end)';
    const { ast } = getAstAndSyntaxErrors(query);
    const params = Walker.params(ast);

    expect(params).toMatchObject([
      {
        type: 'literal',
        literalType: 'param',
        paramType: 'named',
        value: 'start',
      },
      {
        type: 'literal',
        literalType: 'param',
        paramType: 'named',
        value: 'end',
      },
    ]);
  });
});

describe('Walker.hasFunction()', () => {
  test('can find assignment expression', () => {
    const query1 = 'METRICS source bucket(bytes, 1 hour)';
    const query2 = 'METRICS source var0 = bucket(bytes, 1 hour)';
    const has1 = Walker.hasFunction(getAstAndSyntaxErrors(query1).ast!, '=');
    const has2 = Walker.hasFunction(getAstAndSyntaxErrors(query2).ast!, '=');

    expect(has1).toBe(false);
    expect(has2).toBe(true);
  });
});
