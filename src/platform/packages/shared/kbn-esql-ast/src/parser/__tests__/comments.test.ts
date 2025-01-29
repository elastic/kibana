/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';
import { Walker } from '../../walker';

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
});
