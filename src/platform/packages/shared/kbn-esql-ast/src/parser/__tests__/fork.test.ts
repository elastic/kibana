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
    it('can parse single-command FORK query', () => {
      const text = `FROM kibana_ecommerce_data
| FORK
    (WHERE bytes > 1)
    (SORT bytes ASC)
    (LIMIT 100)`;
      const { ast } = parse(text);

      expect(ast[1].args).toHaveLength(3);
      expect(ast[1].args).toMatchObject([
        { type: 'query', commands: [{ name: 'where' }] },
        { type: 'query', commands: [{ name: 'sort' }] },
        { type: 'query', commands: [{ name: 'limit' }] },
      ]);
    });

    it('can parse composite-command FORK query', () => {
      const text = `FROM kibana_ecommerce_data
| FORK
    (WHERE bytes > 1 | SORT bytes ASC | LIMIT 1)
    (WHERE extension.keyword == "txt" | LIMIT 100)`;
      const { ast } = parse(text);

      expect(ast[1].args).toHaveLength(2);
      expect(ast[1].args).toMatchObject([
        { type: 'query', commands: [{ name: 'where' }, { name: 'sort' }, { name: 'limit' }] },
        { type: 'query', commands: [{ name: 'where' }, { name: 'limit' }] },
      ]);
    });
  });

  describe('when incorrectly formatted, returns errors', () => {
    it('when no pipe', () => {
      const text = `FROM kibana_ecommerce_data
| FORK
    (WHERE bytes > 1 LIMIT 1)`;

      const { errors } = parse(text);

      expect(errors.length > 0).toBe(true);
    });

    it('when bad parens', () => {
      const text = `FROM kibana_ecommerce_data
| FORK
    WHERE bytes > 1)`;

      const { errors } = parse(text);

      expect(errors.length > 0).toBe(true);
    });

    it('when unsupported command', () => {
      const text = `FROM kibana_ecommerce_data
      | FORK
          (DROP bytes)`;

      const { errors } = parse(text);

      expect(errors.length > 0).toBe(true);
    });
  });
});
