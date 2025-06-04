/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';

describe('ENRICH', () => {
  describe('correctly formatted', () => {
    it('most basic example', () => {
      const query = 'FROM index | ENRICH a ON b WITH c, d';
      const { root } = parse(query);

      expect(root.commands).toMatchObject([
        {},
        {
          type: 'command',
          name: 'enrich',
          args: [
            {
              type: 'source',
              name: 'a',
              index: {
                type: 'literal',
                literalType: 'keyword',
                valueUnquoted: 'a',
              },
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

    it('with source mode parsed', () => {
      const query = 'FROM index | ENRICH mode:a ON b WITH c, d';
      const { root } = parse(query);

      console.log(root.commands[1].args);

      expect(root.commands).toMatchObject([
        {},
        {
          type: 'command',
          name: 'enrich',
          args: [
            {
              type: 'source',
              name: 'mode:a',
              cluster: {
                type: 'literal',
                literalType: 'keyword',
                valueUnquoted: 'mode',
              },
              index: {
                type: 'literal',
                literalType: 'keyword',
                valueUnquoted: 'a',
              },
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
  });
});
