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
    it('retrieves the specific "WHERE" command by index', () => {
      const src = 'FROM index | LIMIT 1 | WHERE 1 == a | LIMIT 2 | WHERE 2 == b';
      const query = EsqlQuery.fromSrc(src);

      const node1 = commands.where.byField(query.ast, 'b');
      const node2 = commands.where.byField(query.ast, 'a');

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
});
