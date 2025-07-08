/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as helpers from '../helpers';

export const validationFromCommandTestSuite = (setup: helpers.Setup) => {
  describe('validation', () => {
    describe('command', () => {
      describe('FROM <sources> [ METADATA <indices> ]', () => {
        test('errors on invalid command start', async () => {
          const { expectErrors } = await setup();

          await expectErrors('f', [
            "SyntaxError: mismatched input 'f' expecting {'row', 'from', 'show'}",
          ]);
          await expectErrors('from ', [
            "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, UNQUOTED_SOURCE}",
          ]);
        });

        describe('... <sources> ...', () => {
          test('errors on trailing comma', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from index,', [
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, UNQUOTED_SOURCE}",
            ]);
            await expectErrors(`FROM index\n, \tother_index\t,\n \t `, [
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, UNQUOTED_SOURCE}",
            ]);

            await expectErrors(`from assignment = 1`, [
              "SyntaxError: mismatched input '=' expecting <EOF>",
              'Unknown index [assignment]',
            ]);
          });

          test('errors on invalid syntax', async () => {
            const { expectErrors } = await setup();

            await expectErrors('FROM `index`', ['Unknown index [`index`]']);
            await expectErrors(`from assignment = 1`, [
              "SyntaxError: mismatched input '=' expecting <EOF>",
              'Unknown index [assignment]',
            ]);
          });
        });

        describe('... METADATA <indices>', () => {
          test('errors when wrapped in parentheses', async () => {
            const { expectErrors } = await setup();

            await expectErrors(`from index (metadata _id)`, [
              "SyntaxError: mismatched input '(metadata' expecting <EOF>",
            ]);
          });

          describe('validates fields', () => {
            test('validates fields', async () => {
              const { expectErrors } = await setup();
              await expectErrors(`from index metadata _id, _source METADATA _id2`, [
                "SyntaxError: mismatched input 'METADATA' expecting <EOF>",
              ]);
            });
          });
        });
      });
    });
  });
};
