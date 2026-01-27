/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';

describe('Timeseries', () => {
  describe('correctly formatted', () => {
    it('can parse a basic query', () => {
      const text = 'TS foo';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'ts',
          args: [
            {
              type: 'source',
              name: 'foo',
              sourceType: 'index',
            },
          ],
        },
      ]);
    });

    it('can parse multiple "sources"', () => {
      const text = 'TS foo ,\nbar\t,\t\nbaz \n';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'ts',
          args: [
            {
              type: 'source',
              name: 'foo',
              sourceType: 'index',
            },
            {
              type: 'source',
              name: 'bar',
              sourceType: 'index',
            },
            {
              type: 'source',
              name: 'baz',
              sourceType: 'index',
            },
          ],
        },
      ]);
    });
  });

  describe('when incorrectly formatted, returns errors', () => {
    it('when no index identifier specified', () => {
      const text = 'TS \n\t';
      const { errors } = parse(text);

      expect(errors.length > 0).toBe(true);
    });

    it('when comma follows index identifier', () => {
      const text = 'TS foo, ';
      const { errors } = parse(text);

      expect(errors.length > 0).toBe(true);
    });

    it('when comma follows "aggregates"', () => {
      const text = 'from foo agg1, agg2';
      const { errors } = parse(text);

      expect(errors.length > 0).toBe(true);
    });

    it('when "grouping" in BY clause is empty', () => {
      const text = 'from foo agg1, agg2 BY \t';
      const { errors } = parse(text);

      expect(errors.length > 0).toBe(true);
    });

    it('when "grouping" has trailing comma', () => {
      const text = 'from foo agg1, agg2 BY grp1, grp2,';
      const { errors } = parse(text);

      expect(errors.length > 0).toBe(true);
    });
  });
});
