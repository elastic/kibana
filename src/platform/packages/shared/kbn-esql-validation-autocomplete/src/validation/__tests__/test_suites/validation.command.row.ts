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
        test('syntax error', async () => {
          const { expectErrors } = await setup();

          await expectErrors('row var = 1 in ', [
            "SyntaxError: mismatched input '<EOF>' expecting '('",
          ]);
          await expectErrors('row var = 1 in (', [
            "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', 'null', '?', 'true', '+', '-', '??', NAMED_OR_POSITIONAL_PARAM, NAMED_OR_POSITIONAL_DOUBLE_PARAMS, '[', '(', UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
          ]);
          await expectErrors('row var = 1 not in ', [
            "SyntaxError: mismatched input '<EOF>' expecting '('",
          ]);
        });
      });
    });
  });
};
