/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as commands from '..';
import { EsqlQuery } from '../../../query';
import { Builder } from '../../../builder';

describe('commands.where', () => {
  describe('.list()', () => {
    it('lists all "WHERE" commands', () => {
      const src = 'FROM index | LIMIT 1 | WHERE a == 1 | LIMIT 2 | WHERE b == 2';
      const query = EsqlQuery.fromSrc(src);

      const nodes = [...commands.where.list(query.ast)];

      expect(nodes).toMatchObject([
        {
          type: 'command',
          name: 'where',
          args: [
            {
              type: 'function',
              name: '==',
            },
          ],
        },
        {
          type: 'command',
          name: 'where',
          args: [
            {
              type: 'function',
              name: '==',
            },
          ],
        },
      ]);
    });
  });

  describe('.byIndex()', () => {
    it('retrieves the specific "WHERE" command by index', () => {
      const src = 'FROM index | LIMIT 1 | WHERE 1 == a | LIMIT 2 | WHERE 2 == b';
      const query = EsqlQuery.fromSrc(src);

      const node1 = commands.where.byIndex(query.ast, 1);
      const node2 = commands.where.byIndex(query.ast, 0);

      expect(node1).toMatchObject({
        type: 'command',
        name: 'where',
        args: [
          {
            type: 'function',
            name: '==',
            args: [
              {
                type: 'literal',
                value: 2,
              },
              {},
            ],
          },
        ],
      });
      expect(node2).toMatchObject({
        type: 'command',
        name: 'where',
        args: [
          {
            type: 'function',
            name: '==',
            args: [
              {
                type: 'literal',
                value: 1,
              },
              {},
            ],
          },
        ],
      });
    });
  });

  describe('.byField()', () => {
    it('retrieves the specific "WHERE" command by field', () => {
      const src = 'FROM index | LIMIT 1 | WHERE 1 == a | LIMIT 2 | WHERE 2 == b';
      const query = EsqlQuery.fromSrc(src);

      const [command1] = commands.where.byField(query.ast, 'b')!;
      const [command2] = commands.where.byField(query.ast, 'a')!;

      expect(command1).toMatchObject({
        type: 'command',
        name: 'where',
        args: [
          {
            type: 'function',
            name: '==',
            args: [
              {
                type: 'literal',
                value: 2,
              },
              {},
            ],
          },
        ],
      });
      expect(command2).toMatchObject({
        type: 'command',
        name: 'where',
        args: [
          {
            type: 'function',
            name: '==',
            args: [
              {
                type: 'literal',
                value: 1,
              },
              {},
            ],
          },
        ],
      });
    });

    it('can find command by nested field', () => {
      const src = 'FROM index | LIMIT 1 | WHERE 1 == a | LIMIT 2 | WHERE 2 == a.b.c';
      const query = EsqlQuery.fromSrc(src);

      const [command] = commands.where.byField(query.ast, ['a', 'b', 'c'])!;

      expect(command).toMatchObject({
        type: 'command',
        name: 'where',
        args: [
          {
            type: 'function',
            name: '==',
            args: [
              {
                type: 'literal',
                value: 2,
              },
              {},
            ],
          },
        ],
      });
    });

    it('can find command by param', () => {
      const src = 'FROM index | LIMIT 1 | WHERE 1 == a | LIMIT 2 | WHERE ?param == 123';
      const query = EsqlQuery.fromSrc(src);

      const [command1] = commands.where.byField(query.ast, ['?param'])!;
      const [command2] = commands.where.byField(query.ast, '?param')!;

      const expected = {
        type: 'command',
        name: 'where',
        args: [
          {
            type: 'function',
            name: '==',
            args: [
              {},
              {
                type: 'literal',
                value: 123,
              },
            ],
          },
        ],
      };

      expect(command1).toMatchObject(expected);
      expect(command2).toMatchObject(expected);
    });

    it('can find command by nested param', () => {
      const src = 'FROM index | LIMIT 1 | WHERE 1 == a | LIMIT 2 | WHERE a.b.?param == 123';
      const query = EsqlQuery.fromSrc(src);

      const [command] = commands.where.byField(query.ast, ['a', 'b', '?param'])!;

      const expected = {
        type: 'command',
        name: 'where',
        args: [
          {
            type: 'function',
            name: '==',
            args: [
              {},
              {
                type: 'literal',
                value: 123,
              },
            ],
          },
        ],
      };

      expect(command).toMatchObject(expected);
    });

    it('can find command when field is used in function', () => {
      const src = 'FROM index | LIMIT 1 | WHERE 1 == a | LIMIT 2 | WHERE 123 == fn(a.b.c)';
      const query = EsqlQuery.fromSrc(src);

      const [command] = commands.where.byField(query.ast, ['a', 'b', 'c'])!;

      const expected = {
        type: 'command',
        name: 'where',
        args: [
          {
            type: 'function',
            name: '==',
            args: [
              {
                type: 'literal',
                value: 123,
              },
              {},
            ],
          },
        ],
      };

      expect(command).toMatchObject(expected);
    });

    it('can find command when various decorations are applied to the field', () => {
      const src =
        'FROM index | LIMIT 1 | WHERE 1 == a | LIMIT 2 | WHERE 123 == add(1 + fn(NOT -(a.b.c::ip)::INTEGER /* comment */))';
      const query = EsqlQuery.fromSrc(src);

      const [command1] = commands.where.byField(query.ast, ['a', 'b', 'c'])!;
      const command2 = commands.where.byField(query.ast, 'a.b.c');

      const expected = {
        type: 'command',
        name: 'where',
        args: [
          {
            type: 'function',
            name: '==',
            args: [
              {
                type: 'literal',
                value: 123,
              },
              {},
            ],
          },
        ],
      };

      expect(command1).toMatchObject(expected);
      expect(command2).toBe(undefined);
    });

    it('can construct field template using Builder', () => {
      const src =
        'FROM index | LIMIT 1 | WHERE 1 == a | LIMIT 2 | WHERE 123 == add(1 + fn(NOT -(a.b.c::ip)::INTEGER /* comment */))';
      const query = EsqlQuery.fromSrc(src);

      const [command] = commands.where.byField(
        query.ast,
        Builder.expression.column({
          args: [
            Builder.identifier({ name: 'a' }),
            Builder.identifier({ name: 'b' }),
            Builder.identifier({ name: 'c' }),
          ],
        })
      )!;

      const expected = {
        type: 'command',
        name: 'where',
        args: [
          {
            type: 'function',
            name: '==',
            args: [
              {
                type: 'literal',
                value: 123,
              },
              {},
            ],
          },
        ],
      };

      expect(command).toMatchObject(expected);
    });

    it('returns the found column node', () => {
      const src =
        'FROM index | LIMIT 1 | WHERE 1 == a | LIMIT 2 | WHERE 123 == add(1 + fn(NOT -(a.b.c::ip)::INTEGER /* comment */))';
      const query = EsqlQuery.fromSrc(src);

      const [_, column] = commands.where.byField(
        query.ast,
        Builder.expression.column({
          args: [
            Builder.identifier({ name: 'a' }),
            Builder.identifier({ name: 'b' }),
            Builder.identifier({ name: 'c' }),
          ],
        })
      )!;

      expect(column).toMatchObject({
        type: 'column',
        name: 'a.b.c',
      });
    });
  });
});
