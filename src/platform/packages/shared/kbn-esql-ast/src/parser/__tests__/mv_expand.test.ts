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

describe('MV_EXPAND', () => {
  describe('correctly formatted', () => {
    it('parses basic example from documentation', () => {
      const src = `
        ROW a=[1,2,3], b="b", j=["a","b"]
        | MV_EXPAND a`;
      const { ast, errors } = EsqlQuery.fromSrc(src);
      const mvExpand = Walker.match(ast, { type: 'command', name: 'mv_expand' });

      expect(errors.length).toBe(0);
      expect(mvExpand).toMatchObject({
        type: 'command',
        name: 'mv_expand',
        args: [{ name: 'a' }],
      });
    });
  });
});
