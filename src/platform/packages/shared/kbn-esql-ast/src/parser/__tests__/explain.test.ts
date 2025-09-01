/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../query';

describe('EXPLAIN', () => {
  describe('correctly formatted', () => {
    it('parses basic command', () => {
      const query = 'EXPLAIN (FROM index)';
      const { ast } = EsqlQuery.fromSrc(query);

      expect(ast.commands).toMatchObject([
        {
          type: 'command',
          name: 'explain',
          args: [
            {
              type: 'query',
              commands: [
                {
                  type: 'command',
                  name: 'from',
                },
              ],
            },
          ],
        },
      ]);
    });

    it('can parse subqueries recursively', () => {
      const query = 'EXPLAIN ( EXPLAIN ( FROM index ) )';
      const { ast } = EsqlQuery.fromSrc(query);

      expect(ast.commands).toMatchObject([
        {
          type: 'command',
          name: 'explain',
          args: [
            {
              type: 'query',
              commands: [
                {
                  type: 'command',
                  name: 'explain',
                  args: [
                    {
                      type: 'query',
                      commands: [
                        {
                          type: 'command',
                          name: 'from',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);
    });
  });
});
