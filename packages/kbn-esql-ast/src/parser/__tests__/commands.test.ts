/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAstAndSyntaxErrors as parse } from '..';

describe('commands', () => {
  describe('correctly formatted, basic usage', () => {
    it('SHOW', () => {
      const query = 'SHOW info';
      const { ast } = parse(query);

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'show',
          args: [
            {
              type: 'function',
              name: 'info',
            },
          ],
        },
      ]);
    });

    it('META', () => {
      const query = 'META functions';
      const { ast } = parse(query);

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'meta',
          args: [
            {
              type: 'function',
              name: 'functions',
            },
          ],
        },
      ]);
    });

    it('FROM', () => {
      const query = 'FROM index';
      const { ast } = parse(query);

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'index',
            },
          ],
        },
      ]);
    });

    it('ROW', () => {
      const query = 'ROW 1';
      const { ast } = parse(query);

      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'row',
          args: [
            {
              type: 'literal',
              value: 1,
            },
          ],
        },
      ]);
    });

    it('EVAL', () => {
      const query = 'FROM index | EVAL 1';
      const { ast } = parse(query);

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'eval',
          args: [
            {
              type: 'literal',
              value: 1,
            },
          ],
        },
      ]);
    });

    it('STATS', () => {
      const query = 'FROM index | STATS 1';
      const { ast } = parse(query);

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'stats',
          args: [
            {
              type: 'literal',
              value: 1,
            },
          ],
        },
      ]);
    });

    it('LIMIT', () => {
      const query = 'FROM index | LIMIT 1';
      const { ast } = parse(query);

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'limit',
          args: [
            {
              type: 'literal',
              value: 1,
            },
          ],
        },
      ]);
    });

    it('KEEP', () => {
      const query = 'FROM index | KEEP abc';
      const { ast } = parse(query);

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'keep',
          args: [
            {
              type: 'column',
              name: 'abc',
            },
          ],
        },
      ]);
    });

    it('SORT', () => {
      const query = 'FROM index | SORT 1';
      const { ast } = parse(query);

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'sort',
          args: [
            {
              type: 'literal',
              value: 1,
            },
          ],
        },
      ]);
    });

    it('WHERE', () => {
      const query = 'FROM index | WHERE 1';
      const { ast } = parse(query);

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'where',
          args: [
            {
              type: 'literal',
              value: 1,
            },
          ],
        },
      ]);
    });

    it('DROP', () => {
      const query = 'FROM index | DROP abc';
      const { ast } = parse(query);

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'drop',
          args: [
            {
              type: 'column',
              name: 'abc',
            },
          ],
        },
      ]);
    });

    it('RENAME', () => {
      const query = 'FROM index | RENAME a AS b, c AS d';
      const { ast } = parse(query);

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'rename',
          args: [
            {
              type: 'option',
              name: 'as',
              args: [
                {
                  type: 'column',
                  name: 'a',
                },
                {
                  type: 'column',
                  name: 'b',
                },
              ],
            },
            {
              type: 'option',
              name: 'as',
              args: [
                {
                  type: 'column',
                  name: 'c',
                },
                {
                  type: 'column',
                  name: 'd',
                },
              ],
            },
          ],
        },
      ]);
    });

    it('DISSECT', () => {
      const query = 'FROM index | DISSECT a "b" APPEND_SEPARATOR="c"';
      const { ast } = parse(query);

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'dissect',
          args: [
            {
              type: 'column',
              name: 'a',
            },
            {
              type: 'literal',
              value: '"b"',
            },
            {
              type: 'option',
              name: 'append_separator',
              args: [
                {
                  type: 'literal',
                  value: '"c"',
                },
              ],
            },
          ],
        },
      ]);
    });

    it('GROK', () => {
      const query = 'FROM index | GROK a "b"';
      const { ast } = parse(query);

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'grok',
          args: [
            {
              type: 'column',
              name: 'a',
            },
            {
              type: 'literal',
              value: '"b"',
            },
          ],
        },
      ]);
    });

    it('ENRICH', () => {
      const query = 'FROM index | ENRICH a ON b WITH c, d';
      const { ast } = parse(query);

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'enrich',
          args: [
            {
              type: 'source',
              name: 'a',
            },
            {
              type: 'option',
              name: 'on',
              args: [
                {
                  type: 'column',
                  name: 'b',
                },
              ],
            },
            {
              type: 'option',
              name: 'with',
            },
          ],
        },
      ]);
    });

    it('MV_EXPAND', () => {
      const query = 'FROM index | MV_EXPAND a ';
      const { ast } = parse(query);

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'mv_expand',
          args: [
            {
              type: 'column',
              name: 'a',
            },
          ],
        },
      ]);
    });
  });
});
