/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../composer/query';

describe('EVAL', () => {
  describe('correctly formatted', () => {
    it('parses basic command', () => {
      const query = 'FROM a | EVAL a = 1';
      const { ast } = EsqlQuery.fromSrc(query);

      expect(ast.commands).toMatchObject([
        {},
        {
          type: 'command',
          name: 'eval',
          args: [
            {
              type: 'function',
              name: '=',
            },
          ],
        },
      ]);
    });
  });
});
