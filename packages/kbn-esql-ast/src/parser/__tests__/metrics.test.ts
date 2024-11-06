/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAstAndSyntaxErrors as parse } from '..';

describe('METRICS', () => {
  describe('correctly formatted', () => {
    it('can parse a basic query', () => {
      const text = 'METRICS foo';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'metrics',
          sources: [
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
      const text = 'METRICS foo ,\nbar\t,\t\nbaz \n';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'metrics',
          sources: [
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

    it('can parse "aggregates"', () => {
      const text = 'metrics foo agg1, agg2';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'metrics',
          sources: [
            {
              type: 'source',
              name: 'foo',
              sourceType: 'index',
            },
          ],
          aggregates: [
            {
              type: 'column',
              text: 'agg1',
            },
            {
              type: 'column',
              text: 'agg2',
            },
          ],
        },
      ]);
    });

    it('can parse "grouping"', () => {
      const text = 'mEtRiCs foo agg BY grp1, grp2';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'metrics',
          sources: [
            {
              type: 'source',
              name: 'foo',
              sourceType: 'index',
            },
          ],
          aggregates: [
            {
              type: 'column',
              text: 'agg',
            },
          ],
          grouping: [
            {
              type: 'column',
              text: 'grp1',
            },
            {
              type: 'column',
              text: 'grp2',
            },
          ],
        },
      ]);
    });
  });

  describe('when incorrectly formatted, returns errors', () => {
    it('when no index identifier specified', () => {
      const text = 'METRICS \n\t';
      const { errors } = parse(text);

      expect(errors.length > 0).toBe(true);
    });

    it('when comma follows index identifier', () => {
      const text = 'METRICS foo, ';
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
