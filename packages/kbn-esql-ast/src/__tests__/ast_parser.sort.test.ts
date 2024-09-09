/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAstAndSyntaxErrors as parse } from '../ast_parser';

describe('SORT', () => {
  describe('correctly formatted', () => {
    // Un-skip one https://github.com/elastic/kibana/issues/189491 fixed.
    it.skip('example from documentation', () => {
      const text = `
        FROM employees
        | KEEP first_name, last_name, height
        | SORT height DESC
        `;
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {},
        {},
        {
          type: 'command',
          name: 'sort',
          args: [
            {
              type: 'column',
              name: 'height',
            },
          ],
        },
      ]);
    });

    // Un-skip once https://github.com/elastic/kibana/issues/189491 fixed.
    it.skip('can parse various sorting columns with options', () => {
      const text =
        'FROM a | SORT a, b ASC, c DESC, d NULLS FIRST, e NULLS LAST, f ASC NULLS FIRST, g DESC NULLS LAST';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'sort',
          args: [
            {
              type: 'column',
              name: 'a',
            },
            {
              type: 'column',
              name: 'b',
            },
            {
              type: 'column',
              name: 'c',
            },
            {
              type: 'column',
              name: 'd',
            },
            {
              type: 'column',
              name: 'e',
            },
            {
              type: 'column',
              name: 'f',
            },
            {
              type: 'column',
              name: 'g',
            },
          ],
        },
      ]);
    });
  });
});
