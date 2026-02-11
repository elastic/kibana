/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '../core/parser';

describe('source nodes', () => {
  it('cluster vs quoted source', () => {
    const text = 'FROM cluster:index, "cluster:index"';
    const { ast } = parse(text);

    expect(ast).toMatchObject([
      {
        type: 'command',
        name: 'from',
        args: [
          {
            type: 'source',
            name: 'cluster:index',
            index: {
              valueUnquoted: 'index',
            },
            prefix: {
              type: 'literal',
              literalType: 'keyword',
              valueUnquoted: 'cluster',
            },
          },
          {
            type: 'source',
            name: 'cluster:index',
            index: {
              valueUnquoted: 'cluster:index',
            },
          },
        ],
      },
    ]);
  });

  it('date-math syntax', () => {
    const text = 'FROM <logs-{now/d}>';
    const { ast } = parse(text);

    expect(ast).toMatchObject([
      {
        type: 'command',
        name: 'from',
        args: [
          {
            type: 'source',
            name: '<logs-{now/d}>',
            prefix: undefined,
            index: {
              valueUnquoted: '<logs-{now/d}>',
            },
            selector: undefined,
          },
        ],
      },
    ]);
  });

  describe('unquoted', () => {
    it('basic', () => {
      const text = 'FROM a';
      const { ast } = parse(text);

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'a',
              prefix: undefined,
              index: {
                valueUnquoted: 'a',
              },
              selector: undefined,
            },
          ],
        },
      ]);
    });

    it('with slash', () => {
      const text = 'FROM a/b';
      const { ast } = parse(text);

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'a/b',
              prefix: undefined,
              index: {
                valueUnquoted: 'a/b',
              },
              selector: undefined,
            },
          ],
        },
      ]);
    });

    it('dot and star', () => {
      const text = 'FROM a.b-*';
      const { ast } = parse(text);

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'a.b-*',
              prefix: undefined,
              index: {
                valueUnquoted: 'a.b-*',
              },
              selector: undefined,
            },
          ],
        },
      ]);
    });
  });

  describe('double quoted', () => {
    it('basic', () => {
      const text = 'FROM "a"';
      const { ast } = parse(text);

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'a',
              prefix: undefined,
              index: {
                valueUnquoted: 'a',
              },
              selector: undefined,
            },
          ],
        },
      ]);
    });

    it('allows escaped chars', () => {
      const text = 'FROM "a \\" \\r \\n \\t \\\\ b"';
      const { ast } = parse(text);

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: expect.any(String),
              prefix: undefined,
              index: {
                valueUnquoted: 'a " \r \n \t \\ b',
              },
              selector: undefined,
            },
          ],
        },
      ]);
    });
  });

  describe('triple-double quoted', () => {
    it('basic', () => {
      const text = 'FROM """a"""';
      const { ast } = parse(text);

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'a',
              prefix: undefined,
              index: {
                valueUnquoted: 'a',
              },
              selector: undefined,
            },
          ],
        },
      ]);
    });

    it('with double quote in the middle', () => {
      const text = 'FROM """a"b"""';
      const { ast } = parse(text);

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'a"b',
              prefix: undefined,
              index: {
                valueUnquoted: 'a"b',
              },
              selector: undefined,
            },
          ],
        },
      ]);
    });

    it('allows special chars', () => {
      const text = 'FROM """a:\\/b"""';
      const { ast } = parse(text);

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'a:\\/b',
              prefix: undefined,
              index: {
                valueUnquoted: 'a:\\/b',
              },
            },
          ],
        },
      ]);
    });

    it('allows emojis', () => {
      const text = 'FROM """a👍b"""';
      const { ast } = parse(text);

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'a👍b',
              prefix: undefined,
              index: {
                valueUnquoted: 'a👍b',
              },
            },
          ],
        },
      ]);
    });
  });

  describe('cluster string', () => {
    it('basic', () => {
      const text = 'FROM cluster:a';
      const { ast } = parse(text);

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'cluster:a',
              index: {
                valueUnquoted: 'a',
              },
              prefix: {
                type: 'literal',
                literalType: 'keyword',
                valueUnquoted: 'cluster',
              },
            },
          ],
        },
      ]);
    });
  });
});
