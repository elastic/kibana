/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { attachTriggerCommand, setup } from './helpers';

describe('autocomplete.suggest', () => {
  describe('SHOW INFO', () => {
    it('suggests INFO', async () => {
      const { assertSuggestions } = await setup();

      await assertSuggestions('SHOW /', ['INFO']);
    });

    it('suggests pipe after INFO', async () => {
      const { assertSuggestions } = await setup();

      await assertSuggestions('SHOW INFO /', [attachTriggerCommand('| ')]);
      await assertSuggestions('SHOW INFO\t/', [attachTriggerCommand('| ')]);
      await assertSuggestions('SHOW info /', [attachTriggerCommand('| ')]);
    });

    it('suggests nothing after a random word', async () => {
      const { assertSuggestions } = await setup();

      await assertSuggestions('SHOW lolz /', []);
      await assertSuggestions('SHOW inof /', []);
    });
  });
});
