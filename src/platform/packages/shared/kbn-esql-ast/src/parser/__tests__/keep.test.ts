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

describe('KEEP', () => {
  describe('correctly formatted', () => {
    it('parses basic example from documentation', () => {
      const src = `
        FROM employees
        | KEEP emp_no, first_name, last_name, height`;
      const { ast, errors } = EsqlQuery.fromSrc(src);
      const keep = Walker.match(ast, { type: 'command', name: 'keep' });

      expect(errors.length).toBe(0);
      expect(keep).toMatchObject({
        type: 'command',
        name: 'keep',
        args: [{}, {}, {}, {}],
      });
    });
  });
});
