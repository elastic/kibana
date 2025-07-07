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
        test('no errors for valid command', async () => {
          const { expectErrors } = await setup();

          await expectErrors(
            `FROM index
| FORK
  (WHERE keywordField != "" | LIMIT 100)
  (SORT doubleField ASC NULLS LAST)`,
            []
          );

          await expectErrors(
            `FROM index
| FORK
  (WHERE keywordField != "" | LIMIT 100)
  (SORT doubleField ASC NULLS LAST)
  (LIMIT 100)`,
            []
          );
        });

        test('requires at least two branches', async () => {
          const { expectErrors } = await setup();

          await expectErrors(
            `FROM index
| FORK
    (WHERE keywordField != "")`,
            [`[FORK] Must include at least two branches.`]
          );
        });

        test('enforces only one fork command', async () => {
          const { expectErrors } = await setup();

          await expectErrors(
            `FROM index
| FORK
    (WHERE keywordField != "" | LIMIT 100)
    (SORT doubleField ASC NULLS LAST)
| KEEP keywordField
| FORK
    (WHERE keywordField != "foo")
    (WHERE keywordField != "bar")`,
            ['[FORK] a query cannot have more than one FORK command.']
          );
        });

        describe('_fork field', () => {
          test('does NOT recognize _fork field BEFORE FORK', async () => {
            const { expectErrors } = await setup();

            await expectErrors(
              `FROM index
  | KEEP _fork
  | FORK
    (WHERE keywordField != "" | LIMIT 100)
    (SORT doubleField ASC NULLS LAST)`,
              ['Unknown column [_fork]']
            );
          });

          test('DOES recognize _fork field AFTER FORK', async () => {
            const { expectErrors } = await setup();

            await expectErrors(
              `FROM index
  | FORK
    (WHERE keywordField != "" | LIMIT 100)
    (SORT doubleField ASC NULLS LAST)
  | KEEP _fork`,
              []
            );
          });
        });

        describe('... (SUBCOMMAND ...) ...', () => {
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
                '[FORK] Must include at least two branches.',
                '[FORK] a query cannot have more than one FORK command.',
              ]
            );
          });

          describe('user-defined columns', () => {
            it('allows columns to be defined within sub-commands', async () => {
              const { expectErrors } = await setup();

              await expectErrors(
                `FROM index
  | FORK
      (EVAL foo = TO_UPPER(keywordField) | LIMIT 100)
      (EVAL bar = 1)`,
                []
              );
            });

            it('recognizes user-defined columns within branches', async () => {
              const { expectErrors } = await setup();

              await expectErrors(
                `FROM index
  | FORK
      (EVAL foo = TO_UPPER(keywordField) | WHERE foo | LIMIT 100)
      (LIMIT 1)`,
                []
              );
            });

            it.skip('does not recognize user-defined columns between branches', async () => {
              const { expectErrors } = await setup();

              await expectErrors(
                `FROM index
  | FORK
      (EVAL foo = TO_UPPER(keywordField) | LIMIT 100)
      (EVAL TO_LOWER(foo))`,
                ['Unknown column [foo]']
              );
            });

            it('recognizes user-defined columns from all branches after FORK', async () => {
              const { expectErrors } = await setup();

              await expectErrors(
                `FROM index
  | FORK
      (EVAL foo = 1)
      (EVAL bar = 1)
  | KEEP foo, bar`,
                []
              );
            });
          });
        });
      });
    });
  });
};
