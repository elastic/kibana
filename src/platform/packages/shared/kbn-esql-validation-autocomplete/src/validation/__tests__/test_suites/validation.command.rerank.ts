/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as helpers from '../helpers';

export const validationRerankCommandTestSuite = (setup: helpers.Setup) => {
  describe('validation', () => {
    describe('command', () => {
      describe('RERANK <query> ON <field1> [, <field2> [, ...]] WITH <inferenceID>', () => {
        test('validates the most basic query', async () => {
          const { expectErrors } = await setup();

          await expectErrors('FROM index | RERANK "query" ON a = doubleField WITH id', []);
        });

        describe('RERANK <index> ...', () => {
          test('errors is query is not a string', async () => {
            const { expectErrors } = await setup();

            await expectErrors('FROM index | RERANK ["query"] ON a = doubleField WITH id', [
              '[RERANK] a query must be a string, found [list]',
            ]);
            await expectErrors('FROM index | RERANK TRUE ON a = doubleField WITH id', [
              '[RERANK] a query must be a string, found [boolean]',
            ]);
            await expectErrors('FROM index | RERANK 123 ON a = doubleField WITH id', [
              '[RERANK] a query must be a string, found [integer]',
            ]);
            await expectErrors('FROM index | RERANK field.name ON a = doubleField WITH id', [
              expect.any(String),
            ]);
          });

          test('allows query to be a param', async () => {
            const { expectErrors } = await setup();

            await expectErrors('FROM index | RERANK ?named_param ON a = doubleField WITH id', []);
            await expectErrors('FROM index | RERANK ?123 ON a = doubleField WITH id', []);
            await expectErrors('FROM index | RERANK ? ON a = doubleField WITH id', []);
          });
        });

        describe('... ON <field1> [, <field2> [, ...]] ...', () => {
          test('can create new field aliases', async () => {
            const { expectErrors } = await setup();

            await expectErrors(
              'FROM index | RERANK "query" ON a = doubleField, b = doubleField WITH id',
              []
            );
          });

          test('can create new fields using an expression', async () => {
            const { expectErrors } = await setup();

            await expectErrors(
              'FROM index | RERANK "query" ON a = AVG(doubleField), b = AVG(doubleField) WITH id',
              []
            );
          });

          test('can use a field name directly', async () => {
            const { expectErrors } = await setup();

            await expectErrors('FROM index | RERANK "query" ON doubleField WITH id', []);
            await expectErrors('FROM index | RERANK "query" ON `doubleField` WITH id', []);
            await expectErrors(
              'FROM index | RERANK "query" ON doubleField, doubleField WITH id',
              []
            );
          });

          test('param can be used as field', async () => {
            const { expectErrors } = await setup();

            await expectErrors('FROM index | RERANK "query" ON ? WITH id', []);
            await expectErrors('FROM index | RERANK "query" ON ?, ? WITH id', []);
            await expectErrors('FROM index | RERANK "query" ON ?? WITH id', []);
            await expectErrors('FROM index | RERANK "query" ON ??, ?? WITH id', []);
            await expectErrors('FROM index | RERANK "query" ON ?named WITH id', []);
            await expectErrors('FROM index | RERANK "query" ON ?named, ?123 WITH id', []);
            await expectErrors('FROM index | RERANK "query" ON ?0, ?1 WITH id', []);
          });

          test('errors when function expression used as field', async () => {
            const { expectErrors } = await setup();

            await expectErrors('FROM index | RERANK "query" ON AVG(stringField) WITH id', [
              expect.any(String),
            ]);
          });

          test('errors on unknown field', async () => {
            const { expectErrors, validate } = await setup();

            await expectErrors('FROM index | RERANK "query" ON this_is_unknown_field WITH id', [
              'Unknown column [this_is_unknown_field]',
            ]);

            {
              const { errors } = await validate(
                'FROM index | RERANK "query" ON this.is.unknown.field WITH id'
              );
              expect(errors.filter((e) => e.code === 'unknownColumn')).toMatchObject([
                { text: 'Unknown column [this.is.unknown.field]' },
              ]);
            }

            {
              const { errors } = await validate(
                'FROM index | RERANK "query" ON this . is . unknown . field WITH id'
              );
              expect(errors.filter((e) => e.code === 'unknownColumn')).toMatchObject([
                { text: 'Unknown column [this.is.unknown.field]' },
              ]);
            }

            {
              const { errors } = await validate(
                'FROM index | RERANK "query" ON this /* comment */ . /* another comment */ is . unknown . field WITH id'
              );
              expect(errors.filter((e) => e.code === 'unknownColumn')).toMatchObject([
                { text: 'Unknown column [this.is.unknown.field]' },
              ]);
            }
          });
        });

        describe('... WITH <inferenceID>', () => {
          test('inference ID can be identifier', async () => {
            const { expectErrors } = await setup();

            await expectErrors('FROM index | RERANK "query" ON doubleField WITH a', []);
            await expectErrors('FROM index | RERANK "query" ON doubleField WITH id', []);
            await expectErrors('FROM index | RERANK "query" ON doubleField WITH abc123', []);
          });

          test('inference ID can be param or double param', async () => {
            const { expectErrors } = await setup();

            await expectErrors('FROM index | RERANK "query" ON doubleField WITH ?', []);
            await expectErrors('FROM index | RERANK "query" ON doubleField WITH ??', []);

            await expectErrors('FROM index | RERANK "query" ON doubleField WITH ?param', []);
            await expectErrors('FROM index | RERANK "query" ON doubleField WITH ??param', []);

            await expectErrors('FROM index | RERANK "query" ON doubleField WITH ?123', []);
            await expectErrors('FROM index | RERANK "query" ON doubleField WITH ??123', []);
          });

          test('errors when ID is a number', async () => {
            const { validate } = await setup();

            const { errors } = await validate(
              'FROM index | RERANK "query" ON doubleField WITH 123'
            );
            const filtered = errors.filter((e) => e.code === 'rerankInferenceIdMustBeIdentifier');

            expect(filtered).toMatchObject([
              { text: '[RERANK] inference ID must be an identifier or a parameter.' },
            ]);
          });
        });
      });
    });
  });
};
