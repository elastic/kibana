/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as helpers from '../helpers';

export const validationForkCommandTestSuite = (setup: helpers.Setup) => {
  describe('validation', () => {
    describe('command', () => {
      describe('FORK', () => {
        describe('... (SUBCOMMAND ...) ...', () => {
          test('no errors for valid command', async () => {
            const { expectErrors } = await setup();

            await expectErrors(
              `FROM index
| FORK
    (WHERE keywordField != "" | LIMIT 100)
    (SORT doubleField ASC NULLS LAST)`,
              []
            );
          });

          test('validates within subcommands', async () => {
            const { expectErrors } = await setup();

            await expectErrors(
              `FROM index 
| FORK
    (WHERE TO_UPPER(longField) != "" | LIMIT 100)
    (WHERE TO_LOWER(doubleField) == "" | WHERE TRIM(integerField))`,
              [
                'Argument of [to_lower] must be [keyword], found value [doubleField] type [double]',
                'Argument of [to_upper] must be [keyword], found value [longField] type [long]',
                'Argument of [trim] must be [keyword], found value [integerField] type [integer]',
              ]
            );
          });

          test('forwards syntax errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors(
              `FROM index 
| FORK
    (EVAL TO_UPPER(keywordField) | LIMIT 100)
    (FORK (WHERE 1))`,
              [
                "SyntaxError: mismatched input ')' expecting <EOF>",
                "SyntaxError: mismatched input 'EVAL' expecting {'limit', 'sort', 'where'}",
                "SyntaxError: mismatched input 'keywordField' expecting {'limit', 'sort', 'where'}",
                "SyntaxError: token recognition error at: ')'",
              ]
            );
          });
        });
      });
    });
  });
};
