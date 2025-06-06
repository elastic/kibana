/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as helpers from '../helpers';

export const validationRowCommandTestSuite = (setup: helpers.Setup) => {
  describe('validation', () => {
    describe('command', () => {
      describe('ROW', () => {
        test('tuple member type mismatch with left side', async () => {
          const { expectErrors } = await setup();

          await expectErrors('row var = 1 in ("a", "b", "c")', [
            'Argument of [in] must be [integer[]], found value [("a", "b", "c")] type [(keyword, keyword, keyword)]',
          ]);
        });
      });
    });
  });
};
