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

describe('INLINESTATS', () => {
  describe('correctly formatted', () => {
    it('smoke test', () => {
      const src = `
        FROM index
        | INLINESTATS a BY b`;
      const { ast, errors } = EsqlQuery.fromSrc(src);
      const inlinestats = Walker.match(ast, { type: 'command', name: 'inlinestats' });

      expect(errors.length).toBe(0);
      expect(inlinestats).toMatchObject({
        type: 'command',
        name: 'inlinestats',
        args: [{ name: 'a' }, { type: 'option', name: 'by' }],
      });
    });
  });
});
