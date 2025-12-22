/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../composer/query';
import { Walker } from '../../ast/walker';

describe('<TYPE> JOIN command', () => {
  describe('correctly formatted', () => {
    it('can parse out JOIN command', () => {
      const text = `FROM employees | LOOKUP JOIN languages_lookup ON language_code`;
      const query = EsqlQuery.fromSrc(text);

      expect(query.ast.commands[1]).toMatchObject({
        type: 'command',
        name: 'join',
        commandType: 'lookup',
      });
    });

    it('supports all join types', () => {
      const assertJoinType = (type: string) => {
        const text = `FROM employees | ${type} JOIN languages_lookup ON language_code`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1]).toMatchObject({
          type: 'command',
          name: 'join',
          commandType: type.toLowerCase(),
        });
      };

      assertJoinType('LOOKUP');
      assertJoinType('LEFT');
      assertJoinType('RIGHT');
      expect(() => assertJoinType('HASH')).toThrow();
    });

    it('can parse out target identifier', () => {
      const text = `FROM employees | LOOKUP JOIN languages_lookup ON language_code`;
      const query = EsqlQuery.fromSrc(text);

      expect(query.ast.commands[1]).toMatchObject({
        commandType: 'lookup',
        args: [
          {
            type: 'source',
            name: 'languages_lookup',
          },
          {},
        ],
      });
    });

    it('can parse target with AS alias', () => {
      const text = `FROM employees | LOOKUP JOIN languages_lookup AS ll ON language_code`;
      const query = EsqlQuery.fromSrc(text);

      expect(query.ast.commands[1]).toMatchObject({
        commandType: 'lookup',
        args: [
          {
            type: 'function',
            subtype: 'binary-expression',
            name: 'as',
            args: [
              { type: 'source', name: 'languages_lookup' },
              { type: 'identifier', name: 'll' },
            ],
          },
          {},
        ],
      });
    });

    it('can parse out a single "ON" predicate expression', () => {
      const text = `FROM employees | LOOKUP JOIN languages_lookup ON language_code`;
      const query = EsqlQuery.fromSrc(text);

      expect(query.ast.commands[1]).toMatchObject({
        commandType: 'lookup',
        args: [
          {},
          {
            type: 'option',
            name: 'on',
            args: [
              {
                type: 'column',
                name: 'language_code',
                args: [
                  {
                    type: 'identifier',
                    name: 'language_code',
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    it('can parse out multiple "ON" predicate expressions', () => {
      const text = `FROM employees | LOOKUP JOIN languages_lookup ON a, b, c`;
      const query = EsqlQuery.fromSrc(text);

      expect(query.ast.commands[1]).toMatchObject({
        name: 'join',
        args: [
          {},
          {
            type: 'option',
            name: 'on',
            args: [
              {
                type: 'column',
                name: 'a',
              },
              {
                type: 'column',
                name: 'b',
              },
              {
                type: 'column',
                name: 'c',
              },
            ],
          },
        ],
      });
    });

    it('example from documentation', () => {
      const text = `
        FROM employees
          | EVAL language_code = languages
          | LOOKUP JOIN languages_lookup ON language_code
          | WHERE emp_no < 500
          | KEEP emp_no, language_name
          | SORT emp_no
          | LIMIT 10
      `;
      const query = EsqlQuery.fromSrc(text);

      expect(query.ast.commands[2]).toMatchObject({
        type: 'command',
        name: 'join',
        commandType: 'lookup',
        args: [
          {
            type: 'source',
            name: 'languages_lookup',
          },
          {
            type: 'option',
            name: 'on',
            args: [
              {
                type: 'column',
                name: 'language_code',
              },
            ],
          },
        ],
      });
    });

    it('correctly extracts node positions', () => {
      const text = `FROM employees | LOOKUP JOIN index ON on_1, on_2 | LIMIT 1`;
      const query = EsqlQuery.fromSrc(text);
      const node1 = Walker.match(query.ast, { type: 'source', name: 'index' });
      const node2 = Walker.match(query.ast, { type: 'column', name: 'on_1' });
      const node3 = Walker.match(query.ast, { type: 'column', name: 'on_2' });

      expect(query.src.slice(node1?.location.min, node1?.location.max! + 1)).toBe('index');
      expect(query.src.slice(node2?.location.min, node2?.location.max! + 1)).toBe('on_1');
      expect(query.src.slice(node3?.location.min, node3?.location.max! + 1)).toBe('on_2');
    });

    it('correctly extracts JOIN command position', () => {
      const text = `FROM employees | LOOKUP JOIN index ON on_1, on_2 | LIMIT 1`;
      const query = EsqlQuery.fromSrc(text);
      const join = Walker.match(query.ast, { type: 'command', name: 'join' });

      expect(query.src.slice(join?.location.min, join?.location.max! + 1)).toBe(
        'LOOKUP JOIN index ON on_1, on_2'
      );
    });

    it('correctly extracts ON option position', () => {
      const text = `FROM employees | LOOKUP JOIN index ON on_1, on_2 | LIMIT 1`;
      const query = EsqlQuery.fromSrc(text);
      const on = Walker.match(query.ast, { type: 'option', name: 'on' });

      expect(query.src.slice(on?.location.min, on?.location.max! + 1)).toBe('ON on_1, on_2');
    });

    describe('boolean expressions in ON clause', () => {
      it('can parse a single boolean expression', () => {
        const text = `FROM employees | LOOKUP JOIN index ON on_1 > on_2 | LIMIT 1`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1]).toMatchObject({
          name: 'join',
          args: [
            {},
            {
              type: 'option',
              name: 'on',
              args: [
                {
                  type: 'function',
                  name: '>',
                  args: [
                    {
                      type: 'column',
                      name: 'on_1',
                    },
                    {
                      type: 'column',
                      name: 'on_2',
                    },
                  ],
                },
              ],
            },
          ],
        });
      });

      it('can parse multiple conditions separated by commas', () => {
        const text = `FROM employees | LOOKUP JOIN index ON on_1 > on_2, on_3 < on_4, on_5 == on_6 | LIMIT 1`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1]).toMatchObject({
          name: 'join',
          args: [
            {},
            {
              type: 'option',
              name: 'on',
              args: [
                {
                  type: 'function',
                  name: '>',
                  args: [
                    {
                      type: 'column',
                      name: 'on_1',
                    },
                    {
                      type: 'column',
                      name: 'on_2',
                    },
                  ],
                },
                {
                  type: 'function',
                  name: '<',
                  args: [
                    {
                      type: 'column',
                      name: 'on_3',
                    },
                    {
                      type: 'column',
                      name: 'on_4',
                    },
                  ],
                },
                {
                  type: 'function',
                  name: '==',
                  args: [
                    {
                      type: 'column',
                      name: 'on_5',
                    },
                    {
                      type: 'column',
                      name: 'on_6',
                    },
                  ],
                },
              ],
            },
          ],
        });
      });

      it('can parse multiple conditions separated by AND', () => {
        const text = `FROM employees | LOOKUP JOIN index ON on_1 > on_2 AND on_3 < on_4 AND on_5 == on_6 | LIMIT 1`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1]).toMatchObject({
          name: 'join',
          args: [
            {},
            {
              type: 'option',
              name: 'on',
              args: [
                {
                  type: 'function',
                  name: 'and',
                  args: [
                    {
                      type: 'function',
                      name: 'and',
                      args: [
                        {
                          type: 'function',
                          name: '>',
                          args: [
                            {
                              type: 'column',
                              name: 'on_1',
                            },
                            {
                              type: 'column',
                              name: 'on_2',
                            },
                          ],
                        },
                        {
                          type: 'function',
                          name: '<',
                          args: [
                            {
                              type: 'column',
                              name: 'on_3',
                            },
                            {
                              type: 'column',
                              name: 'on_4',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'function',
                      name: '==',
                      args: [
                        {
                          type: 'column',
                          name: 'on_5',
                        },
                        {
                          type: 'column',
                          name: 'on_6',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        });
      });

      it('can parse a MATCH function', () => {
        const text = `FROM left_table
          | LOOKUP JOIN right_table ON MATCH(right_field, "search_term")`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1]).toMatchObject({
          name: 'join',
          args: [
            {},
            {
              type: 'option',
              name: 'on',
              args: [
                {
                  type: 'function',
                  name: 'match',
                  args: [
                    {
                      type: 'column',
                      name: 'right_field',
                    },
                    {
                      type: 'literal',
                      valueUnquoted: 'search_term',
                    },
                  ],
                },
              ],
            },
          ],
        });
      });

      it('can parse a LIKE expression', () => {
        const text = `FROM left_table
          | LOOKUP JOIN right_table
              ON right_field LIKE "*pattern"`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1]).toMatchObject({
          name: 'join',
          args: [
            {},
            {
              type: 'option',
              name: 'on',
              args: [
                {
                  type: 'function',
                  name: 'like',
                  args: [
                    {
                      type: 'column',
                      name: 'right_field',
                    },
                    {
                      type: 'literal',
                      valueUnquoted: '*pattern',
                    },
                  ],
                },
              ],
            },
          ],
        });
      });

      it('parses OR and NOT expressions', () => {
        const text = `FROM left_table
          | LOOKUP JOIN right_table
              ON (right_value < 5000 OR NOT left_id == right_id)`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1]).toMatchObject({
          name: 'join',
          args: [
            {},
            {
              type: 'option',
              name: 'on',
              args: [
                {
                  type: 'function',
                  name: 'or',
                  args: [
                    {
                      type: 'function',
                      name: '<',
                      args: [
                        {
                          type: 'column',
                          name: 'right_value',
                        },
                        {
                          type: 'literal',
                          value: 5000,
                        },
                      ],
                    },
                    {
                      type: 'function',
                      name: 'not',
                      args: [
                        {
                          type: 'function',
                          name: '==',
                          args: [
                            {
                              type: 'column',
                              name: 'left_id',
                            },
                            {
                              type: 'column',
                              name: 'right_id',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        });
      });
    });
  });

  describe('malformed', () => {
    it('can parse JOIN without target', () => {
      const text = `FROM employees | LOOKUP JOIN `;
      const query = EsqlQuery.fromSrc(text);
      expect(query.ast.commands[1].args[0]).toMatchObject({
        sourceType: 'index',
        name: '',
        location: {
          min: 29,
          max: 27,
        },
        text: '',
        incomplete: true,
        type: 'source',
      });
    });

    const testMissingRightOperand = (text: string) => {
      const query = EsqlQuery.fromSrc(text);

      expect(query.ast.commands[1]).toMatchObject({
        name: 'join',
        incomplete: true,
        args: [
          {},
          {
            type: 'option',
            name: 'on',
            incomplete: true,
            args: [
              {
                type: 'unknown',
                incomplete: true,
              },
            ],
          },
        ],
      });
    };

    it('on missing right operand emits "unknown" node and set "incomplete" flag', () => {
      testMissingRightOperand(`FROM left_table
        | LOOKUP JOIN right_table
            ON right_value <`); // <--- missing right operand
      testMissingRightOperand(`FROM left_table
        | LOOKUP JOIN right_table
            ON right_value < `); // <--- missing right operand
    });

    it('on no MATCH operands', () => {
      const text = `FROM left_table
        | LOOKUP JOIN right_table
            ON MATCH(`;
      const query = EsqlQuery.fromSrc(text);

      expect(query.ast.commands[1]).toMatchObject({
        name: 'join',
        args: [
          {},
          {
            type: 'option',
            name: 'on',
            incomplete: true,
            args: [
              {
                type: 'unknown',
                incomplete: true,
              },
            ],
          },
        ],
      });
    });
  });
});
