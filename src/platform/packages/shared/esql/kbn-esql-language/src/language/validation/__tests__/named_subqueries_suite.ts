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
          name: 'a tuple IN subquery that reads a LET where EVAL overwrites a ROW column',
          query:
            'LET a = (ROW i = 1, s = "a" | EVAL i = 2); ROW x = 2, y = "a" | WHERE (y, x) IN (FROM a)',
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

    it.each([
      { name: 'Abc', query: 'LET Abc = (ROW TEST = 1); ROW TEST = 2' },
      { name: 'ABC', query: 'LET ABC = (ROW TEST = 1); FROM ABC | KEEP TEST' },
    ])('rejects the non-lowercase LET name $name', async ({ name, query }) => {
      const { expectErrors } = await setup();

      await expectErrors(query, [`LET binding name "${name}" must be lowercase`]);
    });

    it('rejects a repeated LET declaration', async () => {
      const { expectErrors } = await setup();

      await expectErrors('LET a = (ROW x = 1); LET a = (ROW x = 2); ROW x = 3', [
        'Duplicate LET binding name "a"',
      ]);
    });

    it.each([
      { name: 'a later LET', query: 'LET a = (FROM b); LET b = (ROW x = 1); FROM a', ref: 'b' },
      { name: 'a later LET in TS', query: 'LET a = (TS b); LET b = (ROW k = 1); FROM a', ref: 'b' },
      {
        name: 'a later LET in LOOKUP JOIN',
        query: 'LET a = (ROW k = 1 | LOOKUP JOIN b ON k); LET b = (ROW k = 1); FROM a',
        ref: 'b',
      },
      {
        name: 'itself, even with an index of the same name',
        query: 'LET index = (FROM index); FROM index',
        ref: 'index',
      },
      {
        name: 'a later LET from an unused LET',
        query: 'LET a = (FROM b); LET b = (ROW x = 1); ROW y = 1',
        ref: 'b',
      },
      {
        name: 'a later LET inside a FROM subquery',
        query: 'LET a = (FROM index, (FROM b)); LET b = (ROW x = 1); FROM a',
        ref: 'b',
      },
    ])('rejects a LET body that reads $name', async ({ query, ref }) => {
      const { expectErrors } = await setup();

      await expectErrors(query, [
        `Forward reference in LET bindings: "${ref}" cannot be referenced before its declaration`,
      ]);
    });

    it.each(['LET a = (ROW x = 1); TS a', 'LET index = (ROW x = 1); TS index'])(
      'does not treat a LET binding as an index for TS: %s',
      async (query) => {
        const { expectErrors } = await setup();

        await expectErrors(query, ['Subqueries are not supported in TS command']);
      }
    );

    it.each(['a', 'lookup_index'])('rejects LET %s as the LOOKUP JOIN target', async (name) => {
      const { expectErrors } = await setup();

      await expectErrors(`LET ${name} = (ROW k = 1); ROW k = 1 | LOOKUP JOIN ${name} ON k`, [
        'Subqueries are not supported in LOOKUP JOIN',
      ]);
    });

    describe('METADATA', () => {
      it('accepts METADATA in a LET body read before FUSE', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'LET a = (FROM index METADATA _id, _index, _score); FROM a | FORK (LIMIT 10) (LIMIT 10) | FUSE',
          []
        );
      });

      it('accepts KEY BY and SCORE BY instead of METADATA in FUSE inside a LET read by FROM', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'LET a = (FROM index | EVAL k = keywordField, s = doubleField | FORK (LIMIT 10) (LIMIT 10) | FUSE KEY BY k SCORE BY s); FROM a',
          []
        );
      });

      it('accepts FUSE in an IN subquery over a LET with METADATA', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'LET a = (FROM index METADATA _id, _index, _score); ROW x = "a" | WHERE x IN (FROM a | FORK (LIMIT 1) (LIMIT 2) | FUSE | KEEP keywordField)',
          []
        );
      });

      it('reports a missing FUSE key when the LET supplies the other key and a custom score', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'LET a = (FROM index METADATA _id | KEEP _id | EVAL s = 1.0); FROM (FROM a) | FORK (LIMIT 1) (LIMIT 2) | FUSE SCORE BY s',
          ['[FUSE] The FROM command is missing the _index METADATA field.']
        );
      });

      it('reports an error for an incomplete LIMIT after FROM with METADATA', async () => {
        const { validate } = await setup();

        const { errors } = await validate('LET a = (ROW x = 1); FROM a METADATA _id | LIMIT');

        expect(errors).not.toHaveLength(0);
      });

      it.each([
        {
          name: 'a duplicate LET name',
          query: 'LET a = (ROW x = 1); LET a = (ROW x = 2); FROM a METADATA _id',
          error: 'Duplicate LET binding name "a"',
        },
        {
          name: 'a forward reference',
          query: 'LET a = (FROM b METADATA _id); LET b = (ROW x = 1); FROM a',
          error:
            'Forward reference in LET bindings: "b" cannot be referenced before its declaration',
        },
      ])('reports $name when the query uses METADATA', async ({ query, error }) => {
        const { expectErrors } = await setup();

        await expectErrors(query, [error]);
      });

      it.each([
        {
          name: 'FROM requests METADATA from a LET without indices',
          query: 'LET a = (ROW value = 1); FROM a METADATA _id | KEEP missingField',
        },
        {
          name: 'one LET reads another LET with METADATA',
          query: 'LET a = (FROM index METADATA _id); LET b = (FROM a); FROM b | KEEP missingField',
        },
        {
          name: 'an IN subquery reads a LET with METADATA',
          query:
            'LET a = (FROM index METADATA _id | KEEP _id); ROW x = "a" | WHERE x IN (FROM a) | KEEP missingField',
        },
        {
          name: 'FROM requests METADATA without a LET',
          query: 'FROM index METADATA * | KEEP missingField',
        },
        {
          name: 'FROM requests METADATA alongside an unused LET',
          query: 'LET a = (ROW x = 1); FROM index METADATA _id | KEEP missingField',
        },
        {
          name: 'only an unused LET requests METADATA',
          query:
            'LET a = (ROW x = 1); LET unused = (FROM index METADATA _id); FROM a | KEEP missingField',
        },
      ])('reports an unknown KEEP column when $name', async ({ query }) => {
        const { expectErrors } = await setup();

        await expectErrors(query, ['Unknown column "missingField"']);
      });
    });

    it('ignores an unknown column inside an unused LET', async () => {
      const { expectErrors } = await setup();

      await expectErrors('LET a = (ROW x = 1 | KEEP missing); ROW y = 2', []);
    });

    it('reports an unknown column inside a LET read by FROM', async () => {
      const { expectErrors } = await setup();

      await expectErrors('LET a = (ROW x = 1 | KEEP missing); FROM a', [
        'Unknown column "missing"',
      ]);
    });

    it('reports an unknown column in an EVAL expression inside a LET read by FROM', async () => {
      const { expectErrors } = await setup();

      await expectErrors('LET a = (ROW x = 1 | EVAL y = missing + 1); FROM a', [
        'Unknown column "missing"',
      ]);
    });

    it.each([
      {
        name: 'an index read by a LET when the main query starts with ROW',
        query:
          'LET a = (FROM index | KEEP integerField); ROW x = 1 | WHERE x IN (FROM a | KEEP integerField)',
      },
      {
        name: 'an ENRICH policy used only in a LET',
        query: 'LET a = (FROM index | ENRICH policy); FROM a',
      },
    ])('accepts $name', async ({ query }) => {
      const { expectErrors } = await setup();

      await expectErrors(query, []);
    });

    it('rejects a column excluded by KEEP in the referenced LET', async () => {
      const { expectErrors } = await setup();

      await expectErrors('LET a = (FROM index | KEEP keywordField); FROM a | KEEP doubleField', [
        'Unknown column "doubleField"',
      ]);
    });
  });
};
