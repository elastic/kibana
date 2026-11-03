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
    describe('FROM references', () => {
      it('validates columns against the columns of the LET binding', async () => {
        const { expectErrors } = await setup();

        await expectErrors('LET a = (FROM index | KEEP keywordField); FROM a | KEEP doubleField', [
          'Unknown column "doubleField"',
        ]);
      });
    });

    describe('LET bodies', () => {
      it('validates the body of a LET binding used through another one', async () => {
        const { expectErrors } = await setup();

        await expectErrors('LET a = (FROM index | KEEP missingField); LET b = (FROM a); FROM b', [
          'Unknown column "missingField"',
        ]);
      });

      it('resolves the columns of a chain of LET bindings', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'LET a = (FROM index | KEEP keywordField); LET b = (FROM a | KEEP doubleField); FROM b',
          ['Unknown column "doubleField"']
        );
      });

      it('rejects a LET binding referencing itself, even with an index of the same name', async () => {
        const { expectErrors } = await setup();

        await expectErrors('LET index = (FROM index); FROM index', [
          'Forward reference in LET bindings: "index" cannot be referenced before its declaration',
        ]);
      });

      it('rejects a forward reference inside a FROM subquery of a LET body', async () => {
        const { expectErrors } = await setup();

        await expectErrors('LET a = (FROM index, (FROM b)); LET b = (FROM index); FROM a', [
          'Forward reference in LET bindings: "b" cannot be referenced before its declaration',
        ]);
      });
    });

    describe('unused LET bindings', () => {
      it('does not analyze the body of an unused LET binding', async () => {
        const { expectErrors } = await setup();

        await expectErrors('LET a = (FROM index | KEEP missingField); FROM index', []);
      });

      it('rejects a forward reference in an unused LET binding', async () => {
        const { expectErrors } = await setup();

        await expectErrors('LET a = (FROM b); LET b = (FROM index); FROM index', [
          'Forward reference in LET bindings: "b" cannot be referenced before its declaration',
        ]);
      });

      it('rejects a TS reference in an unused LET binding', async () => {
        const { expectErrors } = await setup();

        await expectErrors('LET a = (FROM index); LET b = (TS a); FROM index', [
          'Subqueries are not supported in TS',
        ]);
      });
    });

    describe('resources', () => {
      it('retrieves the policies of an ENRICH used only in a LET body', async () => {
        const { expectErrors } = await setup();

        await expectErrors('LET a = (FROM index | ENRICH policy); FROM a', []);
      });

      it('retrieves the sources of a LET body when the main query starts with ROW', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'LET a = (FROM index | KEEP integerField); ROW x = 1 | WHERE x IN (FROM a | KEEP integerField)',
          []
        );
      });
    });

    describe('IN subqueries', () => {
      it('resolves the columns of a LET binding inside IN', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'LET a = (FROM index | EVAL x = 1 | KEEP x); FROM index | WHERE keywordField IN (FROM a | KEEP x)',
          [
            'Left field [keywordField] of type [KEYWORD] is incompatible with right field [x] of type [INTEGER]',
          ]
        );
      });
    });

    describe('LOOKUP JOIN references', () => {
      it('rejects a LET target without analyzing its body, even with a lookup index of the same name', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'LET join_index = (FROM missingIndex); FROM index | LOOKUP JOIN join_index ON keywordField',
          ['Subqueries are not supported in LOOKUP JOIN']
        );
      });

      it('rejects a forward reference used as a LOOKUP JOIN target', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'LET selected = (FROM index | LOOKUP JOIN join_index ON keywordField); LET join_index = (FROM missingIndex); FROM selected',
          [
            'Forward reference in LET bindings: "join_index" cannot be referenced before its declaration',
          ]
        );
      });
    });
  });
};
