/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';

describe('FORK', () => {
  describe('correctly formatted', () => {
    it('can parse basic FORK query', () => {
      const text = `FROM kibana_ecommerce_data
| FORK
    (WHERE bytes > 1)
    (SORT bytes ASC)
    (LIMIT 100)`;
      const { ast, errors } = parse(text);

      expect(ast[1].args).toHaveLength(3);
    });
  });
});
