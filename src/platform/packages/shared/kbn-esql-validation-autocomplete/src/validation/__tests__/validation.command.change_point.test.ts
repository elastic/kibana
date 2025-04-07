/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';
import { fields } from '../../__tests__/helpers';

describe('validation', () => {
  describe('command', () => {
    describe('CHANGE_POINT <value> [ ON <condition> AS <type>, <pvalue>]', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      describe('... <value> ...', () => {
        test('validates the most basic query', async () => {
          const { expectErrors } = await setup();
          await expectErrors('FROM index | CHANGE_POINT longField', []);
        });

        test('validates the full query', async () => {
          const { expectErrors } = await setup();
          await expectErrors(
            'FROM index | STATS field = AVG(longField) BY @timestamp=BUCKET(@timestamp, 8 hours) | CHANGE_POINT field ON @timestamp',
            []
          );
        });

        test('raises error on unknown field', async () => {
          const { expectErrors } = await setup();

          await expectErrors('FROM index | CHANGE_POINT notExistingField', [
            'Unknown column [notExistingField]',
          ]);
        });

        test('raises error on unsupported field time for value', async () => {
          const { expectErrors } = await setup();

          await expectErrors('FROM index | CHANGE_POINT keywordField', [
            'CHANGE_POINT only supports numeric types values, found [keywordField] of type [keyword]',
          ]);
        });

        test('raises error when the default @timestamp field is missing', async () => {
          const { expectErrors, callbacks } = await setup();

          // make sure that @timestamp field is not present
          (callbacks.getColumnsFor as jest.Mock).mockResolvedValue(
            fields.filter((v) => v.name !== '@timestamp')
          );

          await expectErrors('FROM index | CHANGE_POINT longField', [
            `[CHANGE_POINT] Default @timestamp column is missing`,
          ]);
        });

        test('allows manual input for ON field', async () => {
          const { expectErrors } = await setup();

          await expectErrors('FROM index | CHANGE_POINT longField ON keywordField', []);
        });

        test('allows renaming for change point type and pValue columns', async () => {
          const { expectErrors } = await setup();
          await expectErrors(
            'FROM index | STATS field = AVG(longField) BY @timestamp=BUCKET(@timestamp, 8 hours) | CHANGE_POINT field ON @timestamp AS changePointType, pValue',
            []
          );
        });

        test('allows renaming for change point type and pValue columns without specifying the ON field', async () => {
          const { expectErrors } = await setup();
          await expectErrors('FROM index | CHANGE_POINT longField AS changePointType, pValue', []);
        });

        test('does not allow renaming for change point type only', async () => {
          const { expectErrors } = await setup();
          await expectErrors(
            'FROM index | STATS field = AVG(longField) BY @timestamp=BUCKET(@timestamp, 8 hours) | CHANGE_POINT field ON @timestamp AS changePointType',
            [`SyntaxError: mismatched input '<EOF>' expecting ','`]
          );
        });
      });
    });
  });
});
