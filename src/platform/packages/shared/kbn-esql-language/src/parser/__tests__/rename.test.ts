/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../composer/query';
import { Walker } from '../../ast/walker';

describe('RENAME', () => {
  describe('correctly formatted', () => {
    it('parses basic example from documentation', () => {
      const src = `
        FROM employees
        | KEEP first_name, last_name, still_hired
        | RENAME still_hired AS employed`;
      const { ast, errors } = EsqlQuery.fromSrc(src);
      const rename = Walker.match(ast, { type: 'command', name: 'rename' });

      expect(errors.length).toBe(0);
      expect(rename).toMatchObject({
        type: 'command',
        name: 'rename',
        args: [
          {
            type: 'function',
            name: 'as',
            args: [{}, {}],
          },
        ],
      });
    });

    it('supports assignment syntax', () => {
      const src = `
        FROM employees
        | KEEP first_name, last_name, still_hired
        | RENAME still_hired = employed`;
      const { ast, errors } = EsqlQuery.fromSrc(src);
      const rename = Walker.match(ast, { type: 'command', name: 'rename' });

      expect(errors.length).toBe(0);
      expect(rename).toMatchObject({
        type: 'command',
        name: 'rename',
        args: [
          {
            type: 'function',
            name: '=',
            args: [{}, {}],
          },
        ],
      });
    });
  });
});
