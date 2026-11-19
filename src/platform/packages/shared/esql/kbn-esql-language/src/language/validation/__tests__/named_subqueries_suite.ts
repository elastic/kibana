/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Setup } from './helpers';

export const runNamedSubqueriesValidationSuite = (setup: Setup) => {
  describe('LET named subqueries validation', () => {
    // Elasticsearch runs these queries, so the validator must not report any error on them.
    describe('queries that Elasticsearch accepts', () => {
      it.each([
        {
          name: 'a LET read by FROM',
          query: 'LET a = (FROM index | KEEP keywordField); FROM a | KEEP keywordField',
        },
        {
          name: 'a LET and an index providing distinct fields in the same FROM',
          query: 'LET a = (ROW letField = 1); FROM a, other_index | KEEP letField, doubleField',
        },
        {
          name: 'a LET inside a FROM subquery',
          query:
            'LET a = (FROM index | KEEP keywordField); FROM (FROM a), other_index | KEEP keywordField',
        },
        {
          name: 'a LET named like an index, inside an IN subquery',
          query:
            'LET other_index = (FROM index | KEEP keywordField); FROM index | WHERE keywordField IN (FROM other_index)',
        },
        {
          name: 'a LET overwriting an EVAL column in a tuple IN subquery',
          query:
            'LET a = (ROW i = 1, s = "a" | EVAL i = 2); ROW x = 2, y = "a" | WHERE (y, x) IN (FROM a)',
        },
        {
          name: 'a LET with wildcard KEEP in a tuple IN subquery',
          query:
            'LET a = (ROW k = 1, val = 2); ROW x = 1, y = 2 | WHERE (x, y) IN (FROM a | KEEP k, v*)',
        },
        {
          name: 'a LET after an inline source in an IN subquery',
          query:
            'LET a = (ROW x = 1); ROW x = 1, y = "a" | WHERE (x, y) IN (FROM (ROW y = "a"), a)',
        },
      ])('accepts $name', async ({ query }) => {
        const { expectErrors, expectElasticsearchAccepts } = await setup();

        await expectErrors(query, []);
        await expectElasticsearchAccepts?.(query);
      });
    });

    it.each(['LET a = (ROW x = 1); TS a', 'LET index = (ROW x = 1); TS index'])(
      'does not treat a LET binding as an index for TS: %s',
      async (query) => {
        const { expectErrors } = await setup();

        await expectErrors(query, ['Subqueries are not supported in TS command']);
      }
    );

    it('keeps comparing IN columns when a KEEP of exact names follows a wildcard', async () => {
      const { expectErrors } = await setup();

      await expectErrors(
        'LET a = (ROW k = "a", tmp1 = 1); ROW x = 1 | WHERE x IN (FROM a | DROP tmp* | KEEP k)',
        ['Left field [x] of type [INTEGER] is incompatible with right field [k] of type [KEYWORD]']
      );
    });

    describe('METADATA', () => {
      it.each([
        {
          name: 'on a LET without indices',
          query: 'LET a = (ROW value = 1); FROM a METADATA _id | KEEP missingField',
        },
        {
          name: 'in a LET read through another LET',
          query: 'LET a = (FROM index METADATA _id); LET b = (FROM a); FROM b | KEEP missingField',
        },
        {
          name: 'in a LET body read before FUSE',
          query:
            'LET a = (FROM index METADATA _id, _index, _score); FROM a | FORK (LIMIT 10) (LIMIT 10) | FUSE',
        },
        {
          name: 'in a LET read by an IN subquery',
          query:
            'LET a = (FROM index METADATA _id | KEEP _id); ROW x = "a" | WHERE x IN (FROM a) | KEEP missingField',
        },
      ])('leaves the semantic validation to Elasticsearch $name', async ({ query }) => {
        const { expectErrors, callbacks } = await setup();

        await expectErrors(query, [], []);
        expect(callbacks.getColumnsFor).not.toHaveBeenCalled();
      });

      it('keeps syntax errors', async () => {
        const { validate } = await setup();

        const { errors } = await validate('LET a = (ROW x = 1); FROM a METADATA _id | LIMIT');

        expect(errors).not.toHaveLength(0);
      });

      it.each([
        {
          name: 'without LET bindings',
          query: 'FROM index METADATA * | KEEP missingField',
        },
        {
          name: 'next to an unused LET',
          query: 'LET a = (ROW x = 1); FROM index METADATA _id | KEEP missingField',
        },
        {
          name: 'when only an unused LET has METADATA',
          query:
            'LET a = (ROW x = 1); LET unused = (FROM index METADATA _id); FROM a | KEEP missingField',
        },
      ])('keeps the column validation $name', async ({ query }) => {
        const { expectErrors } = await setup();

        await expectErrors(query, ['Unknown column "missingField"']);
      });
    });

    it('keeps validating columns against the columns of a LET binding', async () => {
      const { expectErrors } = await setup();

      await expectErrors('LET a = (FROM index | KEEP keywordField); FROM a | KEEP doubleField', [
        'Unknown column "doubleField"',
      ]);
    });
  });
};
