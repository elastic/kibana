/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../query';
import { Walker } from '../../walker';

describe('DROP', () => {
  describe('correctly formatted', () => {
    it('parses basic example', () => {
      const src = `
        FROM employees
        | DROP height*, weight, age`;
      const { ast, errors } = EsqlQuery.fromSrc(src);
      const drop = Walker.match(ast, { type: 'command', name: 'drop' });

      expect(errors.length).toBe(0);
      expect(drop).toMatchObject({
        type: 'command',
        name: 'drop',
        args: [{ name: 'height*' }, { name: 'weight' }, { name: 'age' }],
      });
    });
  });

  describe('invalid query', () => {
    it('no source command specified and no DROP args specified', () => {
      const src = `DROP`;
      const { errors } = EsqlQuery.fromSrc(src);

      expect(errors.length).toBe(1);
      expect(errors[0].message.startsWith('SyntaxError:')).toBe(true);
    });
  });
});
