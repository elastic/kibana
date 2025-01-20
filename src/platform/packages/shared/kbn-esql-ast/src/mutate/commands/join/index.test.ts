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
    it('lists all "JOIN" commands', () => {
      const src =
        'FROM index | LIMIT 1 | JOIN join_index1 ON join_field1 | WHERE b == 2 | JOIN join_index2 ON join_field2 | LIMIT 1';
      const query = EsqlQuery.fromSrc(src);

      const nodes = [...commands.join.list(query.ast)];

      expect(nodes).toMatchObject([
        {
          type: 'command',
          name: 'join',
          args: [
            {
              type: 'identifier',
              name: 'join_index1',
            },
            {},
          ],
        },
        {
          type: 'command',
          name: 'join',
          args: [
            {
              type: 'identifier',
              name: 'join_index2',
            },
            {},
          ],
        },
      ]);
    });
  });

  describe('.byIndex()', () => {
    it('retrieves the specific "WHERE" command by index', () => {
      const src =
        'FROM index | LIMIT 1 | JOIN join_index1 ON join_field1 | WHERE b == 2 | JOIN join_index2 ON join_field2 | LIMIT 1';
      const query = EsqlQuery.fromSrc(src);

      const node1 = commands.join.byIndex(query.ast, 1);
      const node2 = commands.join.byIndex(query.ast, 0);

      expect(node1).toMatchObject({
        type: 'command',
        name: 'join',
        args: [
          {
            type: 'identifier',
            name: 'join_index2',
          },
          {},
        ],
      });
      expect(node2).toMatchObject({
        type: 'command',
        name: 'join',
        args: [
          {
            type: 'identifier',
            name: 'join_index1',
          },
          {},
        ],
      });
    });
  });

  describe('.summarize', () => {
    it('returns a summary of a query', () => {
      const src =
        'FROM index | LIMIT 1 | JOIN join_index1 ON join_field1 | WHERE b == 2 | JOIN join_index2 ON join_field2 | LIMIT 1';
      const query = EsqlQuery.fromSrc(src);
      const summary = commands.join.summarize(query.ast);

      expect(summary).toMatchObject([
        {
          target: {
            index: {
              type: 'identifier',
              name: 'join_index1',
            },
          },
        },
        {
          target: {
            index: {
              type: 'identifier',
              name: 'join_index2',
            },
          },
        },
      ]);
    });
  });
});
