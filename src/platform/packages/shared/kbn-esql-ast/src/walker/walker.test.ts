/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '../parser';
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
  ESQLIdentifier,
} from '../types';
import { walk, Walker } from './walker';

test('can walk all functions', () => {
  const { root } = parse('METRICS index a(b(c(foo)))');
  const functions: string[] = [];

  walk(root, {
    visitFunction: (fn) => functions.push(fn.name),
  });

  expect(functions.sort()).toStrictEqual(['a', 'b', 'c']);
});

test('can find assignment expression', () => {
  const query = 'METRICS source var0 = bucket(bytes, 1 hour)';
  const { root } = parse(query);
  const functions: ESQLFunction[] = [];

  Walker.walk(root, {
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
      const { ast } = parse('FROM index');
      const commands: ESQLCommand[] = [];

      walk(ast, {
        visitCommand: (cmd) => commands.push(cmd),
      });

      expect(commands.map(({ name }) => name).sort()).toStrictEqual(['from']);
    });

    test('can visit all commands', () => {
      const { ast } = parse('FROM index | STATS a = 123 | WHERE 123 | LIMIT 10');
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

    test('can traverse JOIN command', () => {
      const { ast } = parse('FROM index | LEFT JOIN a ON c, d');
      const commands: ESQLCommand[] = [];
      const sources: ESQLSource[] = [];
      const identifiers: ESQLIdentifier[] = [];
      const columns: ESQLColumn[] = [];

      walk(ast, {
        visitCommand: (cmd) => commands.push(cmd),
        visitSource: (id) => sources.push(id),
        visitIdentifier: (id) => identifiers.push(id),
        visitColumn: (col) => columns.push(col),
      });

      expect(commands.map(({ name }) => name).sort()).toStrictEqual(['from', 'join']);
      expect(sources.map(({ name }) => name).sort()).toStrictEqual(['a', 'index']);
      expect(identifiers.map(({ name }) => name).sort()).toStrictEqual(['c', 'd']);
      expect(columns.map(({ name }) => name).sort()).toStrictEqual(['c', 'd']);
    });

    test('"visitAny" can capture command nodes', () => {
      const { ast } = parse('FROM index | STATS a = 123 | WHERE 123 | LIMIT 10');
      const commands: ESQLCommand[] = [];

      walk(ast, {
        visitAny: (node) => {
          if (node.type === 'command') commands.push(node);
        },
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
        const { ast } = parse('FROM index METADATA _index');
        const options: ESQLCommandOption[] = [];

        walk(ast, {
          visitCommandOption: (opt) => options.push(opt),
        });

        expect(options.length).toBe(1);
        expect(options[0].name).toBe('metadata');
      });

      test('"visitAny" can capture an options node', () => {
        const { ast } = parse('FROM index METADATA _index');
        const options: ESQLCommandOption[] = [];

        walk(ast, {
          visitAny: (node) => {
            if (node.type === 'option') options.push(node);
          },
        });

        expect(options.length).toBe(1);
        expect(options[0].name).toBe('metadata');
      });
    });

    describe('command mode', () => {
      test('visits "mode" nodes', () => {
        const { ast } = parse('FROM index | ENRICH a:b');
        const modes: ESQLCommandMode[] = [];

        walk(ast, {
          visitCommandMode: (opt) => modes.push(opt),
        });

        expect(modes.length).toBe(1);
        expect(modes[0].name).toBe('a');
      });

      test('"visitAny" can capture a mode node', () => {
        const { ast } = parse('FROM index | ENRICH a:b');
        const modes: ESQLCommandMode[] = [];

        walk(ast, {
          visitAny: (node) => {
            if (node.type === 'mode') modes.push(node);
          },
        });

        expect(modes.length).toBe(1);
        expect(modes[0].name).toBe('a');
      });
    });

    describe('expressions', () => {
      describe('sources', () => {
        test('iterates through a single source', () => {
          const { ast } = parse('FROM index');
          const sources: ESQLSource[] = [];

          walk(ast, {
            visitSource: (opt) => sources.push(opt),
          });

          expect(sources.length).toBe(1);
          expect(sources[0].name).toBe('index');
        });

        test('"visitAny" can capture a source node', () => {
          const { ast } = parse('FROM index');
          const sources: ESQLSource[] = [];

          walk(ast, {
            visitAny: (node) => {
              if (node.type === 'source') sources.push(node);
            },
          });

          expect(sources.length).toBe(1);
          expect(sources[0].name).toBe('index');
        });

        test('iterates through all sources', () => {
          const { ast } = parse('METRICS index, index2, index3, index4');
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

        test('can walk through "WHERE" binary expression', () => {
          const query = 'FROM index | STATS a = 123 WHERE c == d';
          const { root } = parse(query);
          const expressions: ESQLFunction[] = [];

          walk(root, {
            visitFunction: (node) => {
              if (node.name === 'where') {
                expressions.push(node);
              }
            },
          });

          expect(expressions.length).toBe(1);
          expect(expressions[0]).toMatchObject({
            type: 'function',
            subtype: 'binary-expression',
            name: 'where',
            args: [
              {
                type: 'function',
                name: '=',
              },
              {
                type: 'function',
                name: '==',
              },
            ],
          });
        });
      });

      describe('columns', () => {
        test('can walk through a single column', () => {
          const query = 'ROW x = 1';
          const { ast } = parse(query);
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

        test('"visitAny" can capture a column', () => {
          const query = 'ROW x = 1';
          const { ast } = parse(query);
          const columns: ESQLColumn[] = [];

          walk(ast, {
            visitAny: (node) => {
              if (node.type === 'column') columns.push(node);
            },
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
          const { ast } = parse(query);
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

      describe('functions', () => {
        test('can walk through functions', () => {
          const query = 'FROM a | STATS fn(1), agg(true)';
          const { ast } = parse(query);
          const nodes: ESQLFunction[] = [];

          walk(ast, {
            visitFunction: (node) => nodes.push(node),
          });

          expect(nodes).toMatchObject([
            {
              type: 'function',
              name: 'fn',
            },
            {
              type: 'function',
              name: 'agg',
            },
          ]);
        });

        test('"visitAny" can capture function nodes', () => {
          const query = 'FROM a | STATS fn(1), agg(true)';
          const { ast } = parse(query);
          const nodes: ESQLFunction[] = [];

          walk(ast, {
            visitAny: (node) => {
              if (node.type === 'function') nodes.push(node);
            },
          });

          expect(nodes).toMatchObject([
            {
              type: 'function',
              name: 'fn',
            },
            {
              type: 'function',
              name: 'agg',
            },
          ]);
        });
      });

      describe('literals', () => {
        test('can walk a single literal', () => {
          const query = 'ROW x = 1';
          const { ast } = parse(query);
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
          const { ast } = parse(query);
          const columns: ESQLLiteral[] = [];

          walk(ast, {
            visitLiteral: (node) => columns.push(node),
          });

          expect(columns).toMatchObject([
            {
              type: 'literal',
              literalType: 'integer',
              name: '123',
            },
            {
              type: 'literal',
              literalType: 'keyword',
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
          const { ast } = parse(query);
          const columns: ESQLLiteral[] = [];

          walk(ast, {
            visitLiteral: (node) => columns.push(node),
          });

          expect(columns).toMatchObject([
            {
              type: 'literal',
              literalType: 'integer',
              name: '1',
            },
            {
              type: 'literal',
              literalType: 'keyword',
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
              literalType: 'double',
              name: '3.14',
            },
          ]);
        });
      });

      describe('list literals', () => {
        describe('numeric', () => {
          test('can walk a single numeric list literal', () => {
            const query = 'ROW x = [1, 2]';
            const { ast } = parse(query);
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
                    literalType: 'integer',
                    name: '1',
                  },
                  {
                    type: 'literal',
                    literalType: 'integer',
                    name: '2',
                  },
                ],
              },
            ]);
          });

          test('"visitAny" can capture a list literal', () => {
            const query = 'ROW x = [1, 2]';
            const { ast } = parse(query);
            const lists: ESQLList[] = [];

            walk(ast, {
              visitAny: (node) => {
                if (node.type === 'list') lists.push(node);
              },
            });

            expect(lists.length).toBe(1);
          });

          test('can walk plain literals inside list literal', () => {
            const query = 'ROW x = [1, 2] + [3.3]';
            const { ast } = parse(query);
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
                    literalType: 'integer',
                    name: '1',
                  },
                  {
                    type: 'literal',
                    literalType: 'integer',
                    name: '2',
                  },
                ],
              },
              {
                type: 'list',
                values: [
                  {
                    type: 'literal',
                    literalType: 'double',
                    name: '3.3',
                  },
                ],
              },
            ]);
            expect(literals).toMatchObject([
              {
                type: 'literal',
                literalType: 'integer',
                name: '1',
              },
              {
                type: 'literal',
                literalType: 'integer',
                name: '2',
              },
              {
                type: 'literal',
                literalType: 'double',
                name: '3.3',
              },
            ]);
          });
        });

        describe('boolean', () => {
          test('can walk a single numeric list literal', () => {
            const query = 'ROW x = [true, false]';
            const { ast } = parse(query);
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
            const { ast } = parse(query);
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
            const { ast } = parse(query);
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
                literalType: 'keyword',
                name: '"a"',
              },
              {
                type: 'literal',
                literalType: 'keyword',
                name: '"b"',
              },
              {
                type: 'literal',
                literalType: 'keyword',
                name: '"c"',
              },
              {
                type: 'literal',
                literalType: 'keyword',
                name: '"d"',
              },
              {
                type: 'literal',
                literalType: 'keyword',
                name: '"e"',
              },
            ]);
          });
        });
      });

      describe('time interval', () => {
        test('can visit time interval nodes', () => {
          const query = 'FROM index | STATS a = 123 BY 1h';
          const { ast } = parse(query);
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

        test('"visitAny" can capture time interval expressions', () => {
          const query = 'FROM index | STATS a = 123 BY 1h';
          const { ast } = parse(query);
          const intervals: ESQLTimeInterval[] = [];

          walk(ast, {
            visitAny: (node) => {
              if (node.type === 'timeInterval') intervals.push(node);
            },
          });

          expect(intervals).toMatchObject([
            {
              type: 'timeInterval',
              quantity: 1,
              unit: 'h',
            },
          ]);
        });

        test('"visitAny" does not capture time interval node if type-specific callback provided', () => {
          const query = 'FROM index | STATS a = 123 BY 1h';
          const { ast } = parse(query);
          const intervals1: ESQLTimeInterval[] = [];
          const intervals2: ESQLTimeInterval[] = [];

          walk(ast, {
            visitTimeIntervalLiteral: (node) => intervals1.push(node),
            visitAny: (node) => {
              if (node.type === 'timeInterval') intervals2.push(node);
            },
          });

          expect(intervals1.length).toBe(1);
          expect(intervals2.length).toBe(0);
        });
      });

      describe('cast expression', () => {
        test('can visit cast expression', () => {
          const query = 'FROM index | STATS a = 123::integer';
          const { ast } = parse(query);

          const casts: ESQLInlineCast[] = [];

          walk(ast, {
            visitInlineCast: (node) => casts.push(node),
          });

          expect(casts).toMatchObject([
            {
              type: 'inlineCast',
              castType: 'integer',
              value: {
                type: 'literal',
                literalType: 'integer',
                value: 123,
              },
            },
          ]);
        });

        test('can visit a column inside a deeply nested inline cast', () => {
          const query =
            'FROM index | WHERE 123 == add(1 + fn(NOT -(a.b.c)::INTEGER /* comment */))';
          const { root } = parse(query);

          const columns: ESQLColumn[] = [];

          walk(root, {
            visitColumn: (node) => columns.push(node),
          });

          expect(columns).toMatchObject([
            {
              type: 'column',
              name: 'a.b.c',
            },
          ]);
        });

        test('"visitAny" can capture cast expression', () => {
          const query = 'FROM index | STATS a = 123::integer';
          const { ast } = parse(query);
          const casts: ESQLInlineCast[] = [];

          walk(ast, {
            visitAny: (node) => {
              if (node.type === 'inlineCast') casts.push(node);
            },
          });

          expect(casts).toMatchObject([
            {
              type: 'inlineCast',
              castType: 'integer',
              value: {
                type: 'literal',
                literalType: 'integer',
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
      const { ast } = parse('FROM index');
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
    const { ast } = parse('FROM index | STATS a = 123 | WHERE 123 | LIMIT 10');
    const commands = Walker.commands(ast);

    expect(commands.map(({ name }) => name).sort()).toStrictEqual([
      'from',
      'limit',
      'stats',
      'where',
    ]);
  });
});

describe('Walker.params()', () => {
  test('can collect all params', () => {
    const query = 'ROW x = ?';
    const { ast } = parse(query);
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
    const query =
      'ROW x=1, time=2024-07-10 | stats z = avg(x) by bucket(time, 20, ?_tstart,?_tend)';
    const { ast } = parse(query);
    const params = Walker.params(ast);

    expect(params).toMatchObject([
      {
        type: 'literal',
        literalType: 'param',
        paramType: 'named',
        value: '_tstart',
      },
      {
        type: 'literal',
        literalType: 'param',
        paramType: 'named',
        value: '_tend',
      },
    ]);
  });

  test('can collect params from column names', () => {
    const query = 'ROW ?a.?b';
    const { ast } = parse(query);
    const params = Walker.params(ast);

    expect(params).toMatchObject([
      {
        type: 'literal',
        literalType: 'param',
        paramType: 'named',
        value: 'a',
      },
      {
        type: 'literal',
        literalType: 'param',
        paramType: 'named',
        value: 'b',
      },
    ]);
  });

  test('can collect params from column names, where first part is not a param', () => {
    const query = 'ROW a.?b';
    const { ast } = parse(query);
    const params = Walker.params(ast);

    expect(params).toMatchObject([
      {
        type: 'literal',
        literalType: 'param',
        paramType: 'named',
        value: 'b',
      },
    ]);
  });

  test('can collect all types of param from column name', () => {
    const query = 'ROW ?.?0.?a';
    const { ast } = parse(query);
    const params = Walker.params(ast);

    expect(params).toMatchObject([
      {
        type: 'literal',
        literalType: 'param',
        paramType: 'unnamed',
      },
      {
        type: 'literal',
        literalType: 'param',
        paramType: 'positional',
        value: 0,
      },
      {
        type: 'literal',
        literalType: 'param',
        paramType: 'named',
        value: 'a',
      },
    ]);
  });

  test('can collect params from function names', () => {
    const query = 'FROM a | STATS ?lala()';
    const { ast } = parse(query);
    const params = Walker.params(ast);

    expect(params).toMatchObject([
      {
        type: 'literal',
        literalType: 'param',
        paramType: 'named',
        value: 'lala',
      },
    ]);
  });

  test('can collect params from function names (unnamed)', () => {
    const query = 'FROM a | STATS ?()';
    const { ast } = parse(query);
    const params = Walker.params(ast);

    expect(params).toMatchObject([
      {
        type: 'literal',
        literalType: 'param',
        paramType: 'unnamed',
      },
    ]);
  });

  test('can collect params from function names (positional)', () => {
    const query = 'FROM a | STATS agg(test), ?123()';
    const { ast } = parse(query);
    const params = Walker.params(ast);

    expect(params).toMatchObject([
      {
        type: 'literal',
        literalType: 'param',
        paramType: 'positional',
        value: 123,
      },
    ]);
  });
});

describe('Walker.find()', () => {
  test('can find a bucket() function', () => {
    const query = 'FROM b | STATS var0 = bucket(bytes, 1 hour), fn(1), fn(2), agg(true)';
    const fn = Walker.find(
      parse(query).ast!,
      (node) => node.type === 'function' && node.name === 'bucket'
    );

    expect(fn).toMatchObject({
      type: 'function',
      name: 'bucket',
    });
  });

  test('finds the first "fn" function', () => {
    const query = 'FROM b | STATS var0 = bucket(bytes, 1 hour), fn(1), fn(2), agg(true)';
    const fn = Walker.find(
      parse(query).ast!,
      (node) => node.type === 'function' && node.name === 'fn'
    );

    expect(fn).toMatchObject({
      type: 'function',
      name: 'fn',
      args: [
        {
          type: 'literal',
          value: 1,
        },
      ],
    });
  });
});

describe('Walker.findAll()', () => {
  test('find all "fn" functions', () => {
    const query = 'FROM b | STATS var0 = bucket(bytes, 1 hour), fn(1), fn(2), agg(true)';
    const list = Walker.findAll(
      parse(query).ast!,
      (node) => node.type === 'function' && node.name === 'fn'
    );

    expect(list).toMatchObject([
      {
        type: 'function',
        name: 'fn',
        args: [
          {
            type: 'literal',
            value: 1,
          },
        ],
      },
      {
        type: 'function',
        name: 'fn',
        args: [
          {
            type: 'literal',
            value: 2,
          },
        ],
      },
    ]);
  });
});

describe('Walker.match()', () => {
  test('can find a bucket() function', () => {
    const query = 'FROM b | STATS var0 = bucket(bytes, 1 hour), fn(1), fn(2), agg(true)';
    const fn = Walker.match(parse(query).ast!, {
      type: 'function',
      name: 'bucket',
    });

    expect(fn).toMatchObject({
      type: 'function',
      name: 'bucket',
    });
  });

  test('finds the first "fn" function', () => {
    const query = 'FROM b | STATS var0 = bucket(bytes, 1 hour), fn(1), fn(2), agg(true)';
    const fn = Walker.match(parse(query).ast!, { type: 'function', name: 'fn' });

    expect(fn).toMatchObject({
      type: 'function',
      name: 'fn',
      args: [
        {
          type: 'literal',
          value: 1,
        },
      ],
    });
  });

  test('can find a deeply nested column', () => {
    const query =
      'FROM index | WHERE 123 == add(1 + fn(NOT 10 + -(a.b.c::ip)::INTEGER /* comment */))';
    const { root } = parse(query);
    const res = Walker.match(root, {
      type: 'column',
      name: 'a.b.c',
    });

    expect(res).toMatchObject({
      type: 'column',
      name: 'a.b.c',
    });
  });

  test('can find WHERE command by its type', () => {
    const query = 'FROM index | LEFT JOIN a | RIGHT JOIN b';
    const { root } = parse(query);

    const join1 = Walker.match(root, {
      type: 'command',
      name: 'join',
      commandType: 'left',
    })!;
    const source1 = Walker.match(join1, {
      type: 'source',
      name: 'a',
    })!;
    const join2 = Walker.match(root, {
      type: 'command',
      name: 'join',
      commandType: 'right',
    })!;
    const source2 = Walker.match(join2, {
      type: 'source',
      name: 'b',
    })!;

    expect(source1).toMatchObject({
      name: 'a',
    });
    expect(source2).toMatchObject({
      name: 'b',
    });
  });
});

describe('Walker.matchAll()', () => {
  test('find all "fn" functions', () => {
    const query = 'FROM b | STATS var0 = bucket(bytes, 1 hour), fn(1), fn(2), agg(true)';
    const list = Walker.matchAll(parse(query).ast!, {
      type: 'function',
      name: 'fn',
    });

    expect(list).toMatchObject([
      {
        type: 'function',
        name: 'fn',
        args: [
          {
            type: 'literal',
            value: 1,
          },
        ],
      },
      {
        type: 'function',
        name: 'fn',
        args: [
          {
            type: 'literal',
            value: 2,
          },
        ],
      },
    ]);
  });

  test('find all "fn" and "agg" functions', () => {
    const query = 'FROM b | STATS var0 = bucket(bytes, 1 hour), fn(1), fn(2), agg(true)';
    const list = Walker.matchAll(parse(query).ast!, {
      type: 'function',
      name: ['fn', 'agg'],
    });

    expect(list).toMatchObject([
      {
        type: 'function',
        name: 'fn',
        args: [
          {
            type: 'literal',
            value: 1,
          },
        ],
      },
      {
        type: 'function',
        name: 'fn',
        args: [
          {
            type: 'literal',
            value: 2,
          },
        ],
      },
      {
        type: 'function',
        name: 'agg',
      },
    ]);
  });

  test('find all functions which start with "b" or "a"', () => {
    const query = 'FROM b | STATS var0 = bucket(bytes, 1 hour), fn(1), fn(2), agg(true)';
    const list = Walker.matchAll(parse(query).ast!, {
      type: 'function',
      name: /^a|b/i,
    });

    expect(list).toMatchObject([
      {
        type: 'function',
        name: 'bucket',
      },
      {
        type: 'function',
        name: 'agg',
      },
    ]);
  });
});

describe('Walker.hasFunction()', () => {
  test('can find binary expression expression', () => {
    const query1 = 'FROM a | STATS bucket(bytes, 1 hour)';
    const query2 = 'FROM b | STATS var0 == bucket(bytes, 1 hour)';
    const has1 = Walker.hasFunction(parse(query1).ast!, '==');
    const has2 = Walker.hasFunction(parse(query2).ast!, '==');

    expect(has1).toBe(false);
    expect(has2).toBe(true);
  });
});
