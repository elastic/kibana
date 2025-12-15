/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';
import { EsqlQuery } from '../../composer/query';
import type { ESQLAstItem, ESQLAstRerankCommand, ESQLCommandOption, ESQLMap } from '../../types';
import { Walker } from '../../ast/walker';

describe('Comments', () => {
  describe('can attach "top" comment(s)', () => {
    it('to a single command', () => {
      const text = `
//comment
FROM index`;
      const { root } = parse(text, { withFormatting: true });

      expect(root.commands[0]).toMatchObject({
        type: 'command',
        name: 'from',
        formatting: {
          top: [
            {
              type: 'comment',
              subtype: 'single-line',
              text: 'comment',
            },
          ],
        },
      });
    });

    it('to the second command', () => {
      const text = `
      FROM abc

      // Good limit
      | LIMIT 10`;
      const { ast } = parse(text, { withFormatting: true });

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'limit',
          formatting: {
            top: [
              {
                type: 'comment',
                subtype: 'single-line',
                text: ' Good limit',
              },
            ],
          },
        },
      ]);
    });

    it('to a command (multiline)', () => {
      const text = `
      FROM abc

      /* Good limit */
      | LIMIT 10`;
      const { ast } = parse(text, { withFormatting: true });

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'limit',
          formatting: {
            top: [
              {
                type: 'comment',
                subtype: 'multi-line',
                text: ' Good limit ',
              },
            ],
          },
        },
      ]);
    });

    it('to a command (multiple comments)', () => {
      const text = `
      FROM abc

      /* 1 */
       // 2
        /* 3 */

      | LIMIT 10`;
      const { ast } = parse(text, { withFormatting: true });

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'limit',
          formatting: {
            top: [
              {
                type: 'comment',
                subtype: 'multi-line',
                text: ' 1 ',
              },
              {
                type: 'comment',
                subtype: 'single-line',
                text: ' 2',
              },
              {
                type: 'comment',
                subtype: 'multi-line',
                text: ' 3 ',
              },
            ],
          },
        },
      ]);
    });

    it('to an expression', () => {
      const text = `
        FROM

        // "abc" is the best source
        abc`;
      const { ast } = parse(text, { withFormatting: true });

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              formatting: {
                top: [
                  {
                    type: 'comment',
                    subtype: 'single-line',
                    text: ' "abc" is the best source',
                  },
                ],
              },
            },
          ],
        },
      ]);
    });

    it('to an expression (multiple comments)', () => {
      const text = `
        FROM
        // "abc" is the best source
        /* another comment */ /* one more */
        abc`;
      const { ast } = parse(text, { withFormatting: true });

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              formatting: {
                top: [
                  {
                    type: 'comment',
                    subtype: 'single-line',
                    text: ' "abc" is the best source',
                  },
                  {
                    type: 'comment',
                    subtype: 'multi-line',
                    text: ' another comment ',
                  },
                  {
                    type: 'comment',
                    subtype: 'multi-line',
                    text: ' one more ',
                  },
                ],
              },
            },
          ],
        },
      ]);
    });

    it('to a nested expression', () => {
      const text = `
        FROM a
          | STATS 1 +
            // 2 is the best number
            2`;
      const { ast } = parse(text, { withFormatting: true });

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'stats',
          args: [
            {
              type: 'function',
              name: '+',
              args: [
                {
                  type: 'literal',
                  value: 1,
                },
                {
                  type: 'literal',
                  value: 2,
                  formatting: {
                    top: [
                      {
                        type: 'comment',
                        subtype: 'single-line',
                        text: ' 2 is the best number',
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ]);
    });

    it('to first binary expression operand', () => {
      const text = `
        ROW

        // 1
        1 +
        2`;
      const { root } = parse(text, { withFormatting: true });

      expect(root.commands[0]).toMatchObject({
        type: 'command',
        name: 'row',
        args: [
          {
            type: 'function',
            name: '+',
            args: [
              {
                type: 'literal',
                value: 1,
                formatting: {
                  top: [
                    {
                      type: 'comment',
                      subtype: 'single-line',
                      text: ' 1',
                    },
                  ],
                },
              },
              {
                type: 'literal',
                value: 2,
              },
            ],
          },
        ],
      });
    });

    it('to first binary expression operand, nested in function', () => {
      const text = `
        ROW fn(

        // 1
        1 +
        2
        )`;
      const { root } = parse(text, { withFormatting: true });

      expect(root.commands[0]).toMatchObject({
        type: 'command',
        name: 'row',
        args: [
          {
            type: 'function',
            name: 'fn',
            args: [
              {
                type: 'function',
                name: '+',
                args: [
                  {
                    type: 'literal',
                    value: 1,
                    formatting: {
                      top: [
                        {
                          type: 'comment',
                          subtype: 'single-line',
                          text: ' 1',
                        },
                      ],
                    },
                  },
                  {
                    type: 'literal',
                    value: 2,
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    it('to second binary expression operand', () => {
      const text = `
        ROW
        1 +

        // 2
        2`;
      const { root } = parse(text, { withFormatting: true });

      expect(root.commands[0]).toMatchObject({
        type: 'command',
        name: 'row',
        args: [
          {
            type: 'function',
            name: '+',
            args: [
              {
                type: 'literal',
                value: 1,
              },
              {
                type: 'literal',
                value: 2,
                formatting: {
                  top: [
                    {
                      type: 'comment',
                      subtype: 'single-line',
                      text: ' 2',
                    },
                  ],
                },
              },
            ],
          },
        ],
      });
    });

    it('to second binary expression operand, nested in function', () => {
      const text = `
        ROW fn(
        1 +

        // 2
        2
        )`;
      const { root } = parse(text, { withFormatting: true });

      expect(root.commands[0]).toMatchObject({
        type: 'command',
        name: 'row',
        args: [
          {
            type: 'function',
            name: 'fn',
            args: [
              {
                type: 'function',
                name: '+',
                args: [
                  {
                    type: 'literal',
                    value: 1,
                  },
                  {
                    type: 'literal',
                    value: 2,
                    formatting: {
                      top: [
                        {
                          type: 'comment',
                          subtype: 'single-line',
                          text: ' 2',
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    it('to a function', () => {
      const text = `
        ROW
        // fn comment
        fn(0)`;
      const { root } = parse(text, { withFormatting: true });

      expect(root.commands[0]).toMatchObject({
        type: 'command',
        name: 'row',
        args: [
          {
            type: 'function',
            name: 'fn',
            args: [
              {
                type: 'literal',
                value: 0,
              },
            ],
            formatting: {
              top: [
                {
                  type: 'comment',
                  subtype: 'single-line',
                  text: ' fn comment',
                },
              ],
            },
          },
        ],
      });
    });

    it('to an identifier', () => {
      const text = `FROM index | LEFT JOIN
        // comment
        abc
        ON a = b`;
      const { root } = parse(text, { withFormatting: true });

      expect(root.commands[1]).toMatchObject({
        type: 'command',
        name: 'join',
        args: [
          {
            type: 'source',
            name: 'abc',
            formatting: {
              top: [
                {
                  type: 'comment',
                  subtype: 'single-line',
                  text: ' comment',
                },
              ],
            },
          },
          {},
        ],
      });
    });
  });

  describe('can attach "left" comment(s)', () => {
    it('to a command', () => {
      const text = `/* hello */ FROM abc`;
      const { ast } = parse(text, { withFormatting: true });

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          formatting: {
            left: [
              {
                type: 'comment',
                subtype: 'multi-line',
                text: ' hello ',
              },
            ],
          },
        },
      ]);
    });

    it('to an expression, multiple comments', () => {
      const text = `FROM /* aha */ source, /* 1 */ /*2*/ /* 3 */ abc`;
      const { ast } = parse(text, { withFormatting: true });

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'source',
              formatting: {
                left: [
                  {
                    type: 'comment',
                    subtype: 'multi-line',
                    text: ' aha ',
                  },
                ],
              },
            },
            {
              type: 'source',
              name: 'abc',
              formatting: {
                left: [
                  {
                    type: 'comment',
                    subtype: 'multi-line',
                    text: ' 1 ',
                  },
                  {
                    type: 'comment',
                    subtype: 'multi-line',
                    text: '2',
                  },
                  {
                    type: 'comment',
                    subtype: 'multi-line',
                    text: ' 3 ',
                  },
                ],
              },
            },
          ],
        },
      ]);
    });

    it('to sub-expression', () => {
      const text = `FROM index | STATS 1 + /* aha */ 2`;
      const { ast } = parse(text, { withFormatting: true });

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'stats',
          args: [
            {
              name: '+',
              args: [
                {},
                {
                  type: 'literal',
                  value: 2,
                  formatting: {
                    left: [
                      {
                        type: 'comment',
                        subtype: 'multi-line',
                        text: ' aha ',
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ]);
    });

    it('to an identifier', () => {
      const text = `FROM index | LEFT JOIN
        /* left */ abc
        ON a = b`;
      const { root } = parse(text, { withFormatting: true });

      expect(root.commands[1]).toMatchObject({
        type: 'command',
        name: 'join',
        args: [
          {
            type: 'source',
            name: 'abc',
            formatting: {
              left: [
                {
                  type: 'comment',
                  subtype: 'multi-line',
                  text: ' left ',
                },
              ],
            },
          },
          {},
        ],
      });
    });
  });

  describe('can attach "right" comment(s)', () => {
    it('to an expression', () => {
      const text = `FROM abc /* hello */`;
      const { ast } = parse(text, { withFormatting: true });

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'abc',
              formatting: {
                right: [
                  {
                    type: 'comment',
                    subtype: 'multi-line',
                    text: ' hello ',
                  },
                ],
              },
            },
          ],
        },
      ]);
    });

    it('to an expression, multiple comments', () => {
      const text = `FROM abc /* a */ /* b */, def /* c */`;
      const { ast } = parse(text, { withFormatting: true });

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'abc',
              formatting: {
                right: [
                  {
                    type: 'comment',
                    subtype: 'multi-line',
                    text: ' a ',
                  },
                  {
                    type: 'comment',
                    subtype: 'multi-line',
                    text: ' b ',
                  },
                ],
              },
            },
            {
              type: 'source',
              name: 'def',
              formatting: {
                right: [
                  {
                    type: 'comment',
                    subtype: 'multi-line',
                    text: ' c ',
                  },
                ],
              },
            },
          ],
        },
      ]);
    });

    it('to a nested expression', () => {
      const text = `FROM a | STATS 1 + 2 /* hello */`;
      const { root } = parse(text, { withFormatting: true });

      expect(root.commands[1]).toMatchObject({
        type: 'command',
        name: 'stats',
        args: [
          {
            name: '+',
            args: [
              {
                type: 'literal',
                value: 1,
              },
              {
                type: 'literal',
                value: 2,
                formatting: {
                  right: [
                    {
                      type: 'comment',
                      subtype: 'multi-line',
                      text: ' hello ',
                    },
                  ],
                },
              },
            ],
          },
        ],
      });
    });

    it('to a nested expression - 2', () => {
      const text = `FROM a | STATS 1 + 2 /* 2 */ + 3`;
      const { root } = parse(text, { withFormatting: true });

      expect(root.commands[1]).toMatchObject({
        type: 'command',
        name: 'stats',
        args: [
          {
            name: '+',
            args: [
              {
                name: '+',
                args: [
                  {
                    type: 'literal',
                    value: 1,
                  },
                  {
                    type: 'literal',
                    value: 2,
                    formatting: {
                      right: [
                        {
                          type: 'comment',
                          subtype: 'multi-line',
                          text: ' 2 ',
                        },
                      ],
                    },
                  },
                ],
              },
              {
                type: 'literal',
                value: 3,
              },
            ],
          },
        ],
      });
    });

    it('to a nested expression - 3', () => {
      const text = `FROM a | STATS 1 /* 1 */ + 2 /* 2.1 */ /* 2.2 */ /* 2.3 */ + 3 /* 3.1 */ /* 3.2 */`;
      const { root } = parse(text, { withFormatting: true });

      expect(root.commands[1]).toMatchObject({
        type: 'command',
        name: 'stats',
        args: [
          {
            name: '+',
            args: [
              {
                name: '+',
                args: [
                  {
                    type: 'literal',
                    value: 1,
                    formatting: {
                      right: [
                        {
                          type: 'comment',
                          subtype: 'multi-line',
                          text: ' 1 ',
                        },
                      ],
                    },
                  },
                  {
                    type: 'literal',
                    value: 2,
                    formatting: {
                      right: [
                        {
                          type: 'comment',
                          subtype: 'multi-line',
                          text: ' 2.1 ',
                        },
                        {
                          type: 'comment',
                          subtype: 'multi-line',
                          text: ' 2.2 ',
                        },
                        {
                          type: 'comment',
                          subtype: 'multi-line',
                          text: ' 2.3 ',
                        },
                      ],
                    },
                  },
                ],
              },
              {
                type: 'literal',
                value: 3,
                formatting: {
                  right: [
                    {
                      type: 'comment',
                      subtype: 'multi-line',
                      text: ' 3.1 ',
                    },
                    {
                      type: 'comment',
                      subtype: 'multi-line',
                      text: ' 3.2 ',
                    },
                  ],
                },
              },
            ],
          },
        ],
      });
    });

    it('to an identifier', () => {
      const text = `FROM index | LEFT JOIN
        abc /* right */ // right 2
        ON a = b`;
      const { root } = parse(text, { withFormatting: true });

      expect(root.commands[1]).toMatchObject({
        type: 'command',
        name: 'join',
        args: [
          {
            type: 'source',
            name: 'abc',
            formatting: {
              right: [
                {
                  type: 'comment',
                  subtype: 'multi-line',
                  text: ' right ',
                },
              ],
              rightSingleLine: {
                type: 'comment',
                subtype: 'single-line',
                text: ' right 2',
              },
            },
          },
          {},
        ],
      });
    });

    it('to a column inside ON option', () => {
      const text = `FROM index | LEFT JOIN
        abc
        ON a /* right */ = b`;
      const { root } = parse(text, { withFormatting: true });
      const a = Walker.match(root, { type: 'column', name: 'a' });

      expect(a).toMatchObject({
        type: 'column',
        name: 'a',
        formatting: {
          right: [
            {
              type: 'comment',
              subtype: 'multi-line',
              text: ' right ',
            },
          ],
        },
      });
    });
  });

  describe('can attach "right end" comments', () => {
    it('to an expression', () => {
      const text = `FROM abc // hello`;
      const { ast } = parse(text, { withFormatting: true });

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'abc',
              formatting: {
                rightSingleLine: {
                  type: 'comment',
                  subtype: 'single-line',
                  text: ' hello',
                },
              },
            },
          ],
        },
      ]);
    });

    it('to the second expression', () => {
      const text = `FROM a1, a2        // hello world
      | LIMIT 1`;
      const { ast } = parse(text, { withFormatting: true });

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {},
            {
              type: 'source',
              name: 'a2',
              formatting: {
                rightSingleLine: {
                  type: 'comment',
                  subtype: 'single-line',
                  text: ' hello world',
                },
              },
            },
          ],
        },
        {},
      ]);
    });

    it('to nested expression', () => {
      const text = `
        FROM a
          | STATS 1 + 2 // hello world
`;
      const { ast } = parse(text, { withFormatting: true });

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'stats',
          args: [
            {
              name: '+',
              args: [
                {
                  type: 'literal',
                  value: 1,
                },
                {
                  type: 'literal',
                  value: 2,
                  formatting: {
                    rightSingleLine: {
                      type: 'comment',
                      subtype: 'single-line',
                      text: ' hello world',
                    },
                  },
                },
              ],
            },
          ],
        },
      ]);
    });

    it('to nested expression - 2', () => {
      const text = `
        FROM a
          | STATS 1   // The 1 is important
             + 2
`;
      const { ast } = parse(text, { withFormatting: true });

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'stats',
          args: [
            {
              name: '+',
              args: [
                {
                  type: 'literal',
                  value: 1,
                  formatting: {
                    rightSingleLine: {
                      type: 'comment',
                      subtype: 'single-line',
                      text: ' The 1 is important',
                    },
                  },
                },
                {
                  type: 'literal',
                  value: 2,
                },
              ],
            },
          ],
        },
      ]);
    });
  });

  describe('can attach "bottom" comment(s)', () => {
    it('attaches comment at the end of the program to the last command node from the "bottom"', () => {
      const text = `
FROM a
| LIMIT 1
// the end
`;
      const { ast } = parse(text, { withFormatting: true });

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'limit',
          formatting: {
            bottom: [
              {
                type: 'comment',
                subtype: 'single-line',
                text: ' the end',
              },
            ],
          },
        },
      ]);
    });
  });

  describe('many comments', () => {
    test('can attach all possible inline comments in basic RERANK command', () => {
      const src = `
        FROM a
          | /*0*/ RERANK /*1*/ "query" /*2*/
                ON /*3*/ field /*4*/
                WITH /*5*/ { /*6*/ "inference_id" /*7*/ : /*8*/ "model" /*9*/, /*10*/ "scoreColumn" /*11*/ : /*12*/ "rank_score" /*13*/ } /*14*/`;
      const query = EsqlQuery.fromSrc(src, { withFormatting: true });
      const cmd = query.ast.commands[1] as ESQLAstRerankCommand;

      expect(cmd.formatting).toMatchObject({
        left: [
          {
            type: 'comment',
            subtype: 'multi-line',
            text: '0',
          },
        ],
      });

      expect(cmd.query.formatting).toMatchObject({
        left: [
          {
            type: 'comment',
            subtype: 'multi-line',
            text: '1',
          },
        ],
        right: [
          {
            type: 'comment',
            subtype: 'multi-line',
            text: '2',
          },
        ],
      });

      expect(cmd.fields[0].formatting).toMatchObject({
        left: expect.arrayContaining([
          expect.objectContaining({
            type: 'comment',
            subtype: 'multi-line',
            text: '3',
          }),
        ]),
        right: expect.arrayContaining([
          expect.objectContaining({
            type: 'comment',
            subtype: 'multi-line',
            text: '4',
          }),
        ]),
      });

      // Test WITH option with map parameters
      const isWithOption = (arg: ESQLAstItem): arg is ESQLCommandOption =>
        !!arg && !Array.isArray(arg) && arg.type === 'option' && arg.name === 'with';
      const withOption = cmd.args.find(isWithOption);

      expect(withOption).toBeDefined();

      if (withOption) {
        const map = withOption.args[0] as ESQLMap;
        expect(map.type).toBe('map');

        // Check comments around the map structure (/*5*/ and /*14*/)
        expect(map.formatting).toMatchObject({
          left: expect.arrayContaining([
            expect.objectContaining({
              type: 'comment',
              subtype: 'multi-line',
              text: '5',
            }),
          ]),
          right: expect.arrayContaining([
            expect.objectContaining({
              type: 'comment',
              subtype: 'multi-line',
              text: '14',
            }),
          ]),
        });

        const entries = map.entries;
        expect(entries).toHaveLength(2);

        // "inference_id": "model" with comments /*6*/, /*7*/, /*8*/, /*9*/
        const firstEntry = entries[0];
        expect(firstEntry.key.formatting).toMatchObject({
          left: expect.arrayContaining([
            expect.objectContaining({
              type: 'comment',
              subtype: 'multi-line',
              text: '6',
            }),
          ]),
          right: expect.arrayContaining([
            expect.objectContaining({
              type: 'comment',
              subtype: 'multi-line',
              text: '7',
            }),
          ]),
        });

        expect(firstEntry.value.formatting).toMatchObject({
          left: expect.arrayContaining([
            expect.objectContaining({
              type: 'comment',
              subtype: 'multi-line',
              text: '8',
            }),
          ]),
          right: expect.arrayContaining([
            expect.objectContaining({
              type: 'comment',
              subtype: 'multi-line',
              text: '9',
            }),
          ]),
        });

        // "scoreColumn": "rank_score" with comments /*10*/, /*11*/, /*12*/, /*13*/
        const secondEntry = entries[1];
        expect(secondEntry.key.formatting).toMatchObject({
          left: expect.arrayContaining([
            expect.objectContaining({
              type: 'comment',
              subtype: 'multi-line',
              text: '10',
            }),
          ]),
          right: expect.arrayContaining([
            expect.objectContaining({
              type: 'comment',
              subtype: 'multi-line',
              text: '11',
            }),
          ]),
        });

        expect(secondEntry.value.formatting).toMatchObject({
          left: expect.arrayContaining([
            expect.objectContaining({
              type: 'comment',
              subtype: 'multi-line',
              text: '12',
            }),
          ]),
          right: expect.arrayContaining([
            expect.objectContaining({
              type: 'comment',
              subtype: 'multi-line',
              text: '13',
            }),
          ]),
        });
      }
    });
  });

  describe('comments in query header', () => {
    it('to a single command', () => {
      const text = `
        // The SET pseudo-command is part of the header
        SET a = "b";
        FROM index`;
      const { root } = parse(text, { withFormatting: true });

      expect(root.header![0]).toMatchObject({
        type: 'header-command',
        name: 'set',
        formatting: {
          top: [
            {
              type: 'comment',
              subtype: 'single-line',
              text: ' The SET pseudo-command is part of the header',
            },
          ],
        },
      });
    });

    it('multi-line comment before SET in header', () => {
      const text = `
        /* header info */
        SET x = 123;
        FROM index`;
      const { root } = parse(text, { withFormatting: true });

      expect(root.header![0]).toMatchObject({
        type: 'header-command',
        name: 'set',
        formatting: {
          top: [
            {
              type: 'comment',
              subtype: 'multi-line',
              text: ' header info ',
            },
          ],
        },
      });
    });

    it('multiple SET header commands each with comments', () => {
      const text = `
        // first header
        SET a = 1;
        // second header
        SET b = 2;
        FROM index`;
      const { root } = parse(text, { withFormatting: true });

      expect(root.header).toHaveLength(2);
      expect(root.header![0]).toMatchObject({
        type: 'header-command',
        name: 'set',
        formatting: {
          top: [
            {
              type: 'comment',
              subtype: 'single-line',
              text: ' first header',
            },
          ],
        },
      });

      expect(root.header![1]).toMatchObject({
        type: 'header-command',
        name: 'set',
        formatting: {
          top: [
            {
              type: 'comment',
              subtype: 'single-line',
              text: ' second header',
            },
          ],
        },
      });
    });

    it('left and right from header command', () => {
      const text = `
        // first header
        /* a */ /* b */ SET a = 1; /* c */ // d
        // second header
        SET b = 2;
        FROM index`;
      const { root } = parse(text, { withFormatting: true });

      expect(root.header).toHaveLength(2);
      expect(root.header![0]).toMatchObject({
        type: 'header-command',
        name: 'set',
        formatting: {
          top: [{ type: 'comment' }],
          left: [
            { type: 'comment', text: ' a ' },
            { type: 'comment', text: ' b ' },
          ],
          right: [{ type: 'comment', text: ' c ' }],
          rightSingleLine: { type: 'comment', text: ' d' },
        },
      });
    });

    it('inside a header command', () => {
      const text = `
        SET /* a */ a /* b */ = /* c */ 1 /* d */ ;
        SET b = 2;
        FROM index`;
      const { root, errors } = parse(text, { withFormatting: true });

      expect(errors).toHaveLength(0);
      expect(root.header).toHaveLength(2);
      expect(root.header![0]).toMatchObject({
        type: 'header-command',
        name: 'set',
        args: [
          {
            type: 'function',
            name: '=',
            args: [
              {
                type: 'identifier',
                name: 'a',
                formatting: {
                  left: [{ type: 'comment', text: ' a ' }],
                  right: [{ type: 'comment', text: ' b ' }],
                },
              },
              {
                type: 'literal',
                value: 1,
                formatting: {
                  left: [{ type: 'comment', text: ' c ' }],
                  right: [{ type: 'comment', text: ' d ' }],
                },
              },
            ],
          },
        ],
      });
    });
  });
});
