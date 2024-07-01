/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METADATA_FIELDS } from '../../../shared/constants';
import * as helpers from '../helpers';

export const validationFromCommandTestSuite = (setup: helpers.Setup) => {
  describe('validation', () => {
    describe('command', () => {
      describe('FROM <sources> [ METADATA <indices> ]', () => {
        test('errors on invalid command start', async () => {
          const { expectErrors } = await setup();

          await expectErrors('f', [
            "SyntaxError: mismatched input 'f' expecting {'explain', 'from', 'meta', 'metrics', 'row', 'show'}",
          ]);
          await expectErrors('from ', [
            "SyntaxError: missing INDEX_UNQUOTED_IDENTIFIER at '<EOF>'",
          ]);
        });

        describe('... <sources> ...', () => {
          test('no errors on correct indices usage', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from index', []);
            await expectErrors('FROM index', []);
            await expectErrors('FrOm index', []);
            await expectErrors('from index, other_index', []);
            await expectErrors('from index, other_index,.secret_index', []);
            await expectErrors('from .secret_index', []);
            await expectErrors('from .secret_index', []);
            await expectErrors('from .secret_index', []);
            await expectErrors('from ind*, other*', []);
            await expectErrors('from index*', []);
            await expectErrors('FROM *a_i*dex*', []);
            await expectErrors('FROM in*ex*', []);
            await expectErrors('FROM *n*ex', []);
            await expectErrors('FROM *n*ex*', []);
            await expectErrors('FROM i*d*x*', []);
            await expectErrors('FROM i*d*x', []);
            await expectErrors('FROM i***x*', []);
            await expectErrors('FROM i****', []);
            await expectErrors('FROM i**', []);
            await expectErrors('fRoM index**', []);
            await expectErrors('fRoM *ex', []);
            await expectErrors('fRoM *ex*', []);
            await expectErrors('fRoM in*ex', []);
            await expectErrors('fRoM ind*ex', []);
            await expectErrors('fRoM *,-.*', []);
            await expectErrors('fRoM remote-*:indexes*', []);
            await expectErrors('fRoM remote-*:indexes', []);
            await expectErrors('fRoM remote-ccs:indexes', []);
            await expectErrors('fRoM a_index, remote-ccs:indexes', []);
            await expectErrors('fRoM .secret_index', []);
            await expectErrors('from my-index', []);
          });

          test('errors on trailing comma', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from index,', [
              "SyntaxError: missing INDEX_UNQUOTED_IDENTIFIER at '<EOF>'",
            ]);
            await expectErrors(`FROM index\n, \tother_index\t,\n \t `, [
              "SyntaxError: missing INDEX_UNQUOTED_IDENTIFIER at '<EOF>'",
            ]);

            await expectErrors(`from assignment = 1`, [
              "SyntaxError: mismatched input '=' expecting <EOF>",
              'Unknown index [assignment]',
            ]);
          });

          test('errors on invalid syntax', async () => {
            const { expectErrors } = await setup();

            await expectErrors('FROM `index`', [
              "SyntaxError: token recognition error at: '`'",
              "SyntaxError: token recognition error at: '`'",
            ]);
            await expectErrors(`from assignment = 1`, [
              "SyntaxError: mismatched input '=' expecting <EOF>",
              'Unknown index [assignment]',
            ]);
          });

          test('errors on unknown index', async () => {
            const { expectErrors } = await setup();

            await expectErrors(`FROM index, missingIndex`, ['Unknown index [missingIndex]']);
            await expectErrors(`from average()`, ['Unknown index [average()]']);
            await expectErrors(`fRom custom_function()`, ['Unknown index [custom_function()]']);
            await expectErrors(`FROM indexes*`, ['Unknown index [indexes*]']);
            await expectErrors('from numberField', ['Unknown index [numberField]']);
            await expectErrors('FROM policy', ['Unknown index [policy]']);
          });
        });

        describe('... METADATA <indices>', () => {
          test('no errors on correct METADATA ... usage', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from index metadata _id', []);
            await expectErrors('from index metadata _id, \t\n _index\n ', []);
          });

          test('errors when wrapped in brackets', async () => {
            const { expectErrors } = await setup();

            await expectErrors(`from index (metadata _id)`, [
              "SyntaxError: mismatched input '(metadata' expecting <EOF>",
            ]);
          });

          for (const isWrapped of [true, false]) {
            function setWrapping(option: string) {
              return isWrapped ? `[${option}]` : option;
            }

            function addBracketsWarning() {
              return isWrapped
                ? ["Square brackets '[]' need to be removed from FROM METADATA declaration"]
                : [];
            }

            describe(`wrapped = ${isWrapped}`, () => {
              test('no errors on correct usage, waning on square brackets', async () => {
                const { expectErrors } = await setup();

                await expectErrors(`from index ${setWrapping('METADATA _id')}`, []);
                await expectErrors(
                  `from index ${setWrapping('METADATA _id')}`,
                  [],
                  addBracketsWarning()
                );
                await expectErrors(
                  `from index ${setWrapping('metadata _id')}`,
                  [],
                  addBracketsWarning()
                );
                await expectErrors(
                  `from index ${setWrapping('METADATA _id, _source')}`,
                  [],
                  addBracketsWarning()
                );
                await expectErrors(
                  `from remote-ccs:indexes ${setWrapping('METADATA _id')}`,
                  [],
                  addBracketsWarning()
                );
                await expectErrors(
                  `from *:indexes ${setWrapping('METADATA _id')}`,
                  [],
                  addBracketsWarning()
                );
              });

              test('validates fields', async () => {
                const { expectErrors } = await setup();

                await expectErrors(
                  `from index ${setWrapping('METADATA _id, _source2')}`,
                  [
                    `Metadata field [_source2] is not available. Available metadata fields are: [${METADATA_FIELDS.join(
                      ', '
                    )}]`,
                  ],
                  addBracketsWarning()
                );
                await expectErrors(
                  `from index ${setWrapping('metadata _id, _source')} ${setWrapping(
                    'METADATA _id2'
                  )}`,
                  [
                    isWrapped
                      ? "SyntaxError: mismatched input '[' expecting <EOF>"
                      : "SyntaxError: mismatched input 'METADATA' expecting <EOF>",
                  ],
                  addBracketsWarning()
                );
              });
            });
          }
        });
      });
    });
  });
};
