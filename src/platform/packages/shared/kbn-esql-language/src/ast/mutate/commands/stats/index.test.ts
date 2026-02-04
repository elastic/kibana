/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as commands from '..';
import { EsqlQuery } from '../../../../composer/query';

describe('commands.stats', () => {
  describe('.list()', () => {
    it('lists all "STATS" commands', () => {
      const src = 'FROM index | LIMIT 1 | STATS agg() | LIMIT 2 | STATS max()';
      const query = EsqlQuery.fromSrc(src);

      const nodes = [...commands.stats.list(query.ast)];

      expect(nodes).toMatchObject([
        {
          type: 'command',
          name: 'stats',
          args: [
            {
              type: 'function',
              name: 'agg',
            },
          ],
        },
        {
          type: 'command',
          name: 'stats',
          args: [
            {
              type: 'function',
              name: 'max',
            },
          ],
        },
      ]);
    });
  });

  describe('.byIndex()', () => {
    it('retrieves the specific "STATS" command by index', () => {
      const src = 'FROM index | LIMIT 1 | STATS agg() | LIMIT 2 | STATS max()';
      const query = EsqlQuery.fromSrc(src);

      const node1 = commands.stats.byIndex(query.ast, 1);
      const node2 = commands.stats.byIndex(query.ast, 0);

      expect(node1).toMatchObject({
        type: 'command',
        name: 'stats',
        args: [
          {
            type: 'function',
            name: 'max',
          },
        ],
      });
      expect(node2).toMatchObject({
        type: 'command',
        name: 'stats',
        args: [
          {
            type: 'function',
            name: 'agg',
          },
        ],
      });
    });
  });
});
