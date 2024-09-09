/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAstAndSyntaxErrors as parse } from '../ast_parser';

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
            cluster: 'cluster',
            index: 'index',
          },
          {
            type: 'source',
            name: 'cluster:index',
            cluster: '',
            index: 'cluster:index',
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
            cluster: '',
            index: '<logs-{now/d}>',
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
              cluster: '',
              index: 'a',
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
              cluster: '',
              index: 'a/b',
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
              cluster: '',
              index: 'a.b-*',
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
              cluster: '',
              index: 'a',
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
              cluster: '',
              index: 'a " \r \n \t \\ b',
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
              cluster: '',
              index: 'a',
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
              cluster: '',
              index: 'a"b',
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
              cluster: '',
              index: 'a:\\/b',
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
              cluster: '',
              index: 'a👍b',
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
              cluster: 'cluster',
              index: 'a',
            },
          ],
        },
      ]);
    });
  });
});
