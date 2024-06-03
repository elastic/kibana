/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setup } from './helpers';

describe('validation', () => {
  describe('command', () => {
    describe('METRICS', () => {
      test('no errors on valid index list', async () => {
        const { expectErrors } = await setup();

        await expectErrors('metrics index', []);
        await expectErrors('metrics index, other_index', []);
        await expectErrors('metrics index, other_index,.secret_index', []);
        await expectErrors('metrics .secret_index', []);
        await expectErrors('METRICS .secret_index', []);
        await expectErrors('mEtRiCs .secret_index', []);
      });

      test('errors on invalid command start', async () => {
        const { expectErrors } = await setup();

        await expectErrors('m', [
          "SyntaxError: mismatched input 'm' expecting {'explain', 'from', 'meta', 'metrics', 'row', 'show'}",
        ]);
        await expectErrors('metrics ', [
          "SyntaxError: missing INDEX_UNQUOTED_IDENTIFIER at '<EOF>'",
        ]);
      });

      describe('indices', () => {
        test('no errors on correct indices usage', async () => {
          const { expectErrors } = await setup();

          await expectErrors('metrics ind*, other*', []);
          await expectErrors('metrics index*', []);
          await expectErrors('metrics *a_i*dex*', []);
          await expectErrors('metrics in*ex*', []);
          await expectErrors('metrics *n*ex', []);
          await expectErrors('metrics *n*ex*', []);
          await expectErrors('metrics i*d*x*', []);
          await expectErrors('metrics i*d*x', []);
          await expectErrors('metrics i***x*', []);
          await expectErrors('metrics i****', []);
          await expectErrors('metrics i**', []);
          await expectErrors('metrics index**', []);
          await expectErrors('metrics *ex', []);
          await expectErrors('metrics *ex*', []);
          await expectErrors('metrics in*ex', []);
          await expectErrors('metrics ind*ex', []);
          await expectErrors('metrics *,-.*', []);
          await expectErrors('metrics remote-*:indexes*', []);
          await expectErrors('metrics remote-*:indexes', []);
          await expectErrors('metrics remote-ccs:indexes', []);
          await expectErrors('metrics a_index, remote-ccs:indexes', []);
          await expectErrors('metrics .secret_index', []);
        });

        test('errors on trailing comma', async () => {
          const { expectErrors } = await setup();

          await expectErrors('metrics index,', [
            "SyntaxError: missing INDEX_UNQUOTED_IDENTIFIER at '<EOF>'",
          ]);
          await expectErrors(`metrics index\n, \tother_index\t,\n \t `, [
            "SyntaxError: missing INDEX_UNQUOTED_IDENTIFIER at '<EOF>'",
          ]);
        });

        test('errors on invalid syntax', async () => {
          const { expectErrors } = await setup();

          await expectErrors(`metrics index = 1`, [
            "SyntaxError: token recognition error at: '='",
            "SyntaxError: token recognition error at: '1'",
          ]);
          await expectErrors('metrics `index`', [
            "SyntaxError: token recognition error at: '`'",
            "SyntaxError: token recognition error at: '`'",
          ]);
        });

        test('errors on unknown index', async () => {
          const { expectErrors } = await setup();

          await expectErrors(`METRICS index, missingIndex`, ['Unknown index [missingIndex]']);
          await expectErrors(`METRICS average()`, ['Unknown index [average()]']);
          await expectErrors(`metrics custom_function()`, ['Unknown index [custom_function()]']);
          await expectErrors(`metrics indexes*`, ['Unknown index [indexes*]']);
          await expectErrors('metrics numberField', ['Unknown index [numberField]']);
          await expectErrors('metrics policy', ['Unknown index [policy]']);
        });
      });
    });
  });
});
