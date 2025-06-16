/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as helpers from '../helpers';

export const validationJoinCommandTestSuite = (setup: helpers.Setup) => {
  describe('validation', () => {
    describe('command', () => {
      describe('<LEFT | RIGHT | LOOKUP> JOIN <index> [ AS <alias> ] ON <condition> [, <condition> [, ...]]', () => {
        describe('... <index> ...', () => {
          test('validates the most basic query', async () => {
            const { expectErrors } = await setup();

            await expectErrors('FROM index | LEFT JOIN join_index ON stringField', []);
          });

          test('raises error, when index is not suitable for JOIN command', async () => {
            const { expectErrors } = await setup();

            await expectErrors('FROM index | LEFT JOIN index ON stringField', [
              '[index] index is not a valid JOIN index. Please use a "lookup" mode index JOIN commands.',
            ]);
            await expectErrors('FROM index | LEFT JOIN non_existing_index_123 ON stringField', [
              '[non_existing_index_123] index is not a valid JOIN index. Please use a "lookup" mode index JOIN commands.',
            ]);
          });

          test('allows lookup index', async () => {
            const { expectErrors } = await setup();

            await expectErrors('FROM index | LEFT JOIN join_index ON stringField', []);
            await expectErrors('FROM index | LEFT JOIN join_index_with_alias ON stringField', []);
          });

          test('allows lookup index alias', async () => {
            const { expectErrors } = await setup();

            await expectErrors('FROM index | LEFT JOIN join_index_alias_1 ON stringField', []);
            await expectErrors('FROM index | LEFT JOIN join_index_alias_2 ON stringField', []);
          });

          test('handles correctly conflicts', async () => {
            const { expectErrors } = await setup();

            await expectErrors(
              'FROM index  | EVAL keywordField = to_IP(keywordField) | LEFT JOIN join_index ON keywordField',
              []
            );
          });
        });

        test.todo('... AS <alias> ...');
      });
    });
  });
};
