/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getNewVariableSuggestion } from '../factories';
import { attachTriggerCommand, getFunctionSignaturesByReturnType, setup } from './helpers';

describe('autocomplete.suggest', () => {
  describe('ROW column1 = value1[, ..., columnN = valueN]', () => {
    const functions = getFunctionSignaturesByReturnType('row', 'any', { scalar: true });
    it('suggests functions and an assignment for new expressions', async () => {
      const { assertSuggestions } = await setup();
      const expectedSuggestions = [getNewVariableSuggestion('var0'), ...functions];

      await assertSuggestions('ROW /', expectedSuggestions);
      await assertSuggestions('ROW foo = "bar", /', expectedSuggestions);
    });

    it('suggests only functions after an assignment', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions('ROW var0 = /', functions);
    });

    it('suggests a comma and a pipe after a complete expression', async () => {
      const { assertSuggestions } = await setup();
      const expected = [', ', '| '].map(attachTriggerCommand);

      await assertSuggestions('ROW var0 = 23 /', expected);
      await assertSuggestions('ROW ABS(23) /', expected);
      await assertSuggestions('ROW ABS(23), var0=234 /', expected);
    });
  });
});
