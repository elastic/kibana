/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';

describe('LIMIT', () => {
  describe('correctly formatted', () => {
    it('can parse single-command LIMIT query', () => {
      const text = `FROM index | LIMIT 100`;
      const { ast } = parse(text);

      expect(ast[1].args).toHaveLength(1);
      expect(ast[1].args).toMatchObject([{ type: 'literal', value: 100 }]);
    });

    it('LIMIT (with param)', () => {
      const query = 'FROM index | LIMIT ?param';
      const { ast } = parse(query);

      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'limit',
          args: [
            [
              {
                incomplete: false,
                name: '',
                paramKind: '?',
                paramType: 'named',
                text: '?param',
                type: 'literal',
                literalType: 'param',
                value: 'param',
                location: {
                  max: 24,
                  min: 19,
                },
              },
            ],
          ],
        },
      ]);
    });
  });

  describe('when incorrectly formatted, returns errors', () => {
    it('when no integer value', () => {
      const text = `FROM index | LIMIT 'string'`;

      const { errors } = parse(text);

      expect(errors.length > 0).toBe(true);
    });
  });
});
