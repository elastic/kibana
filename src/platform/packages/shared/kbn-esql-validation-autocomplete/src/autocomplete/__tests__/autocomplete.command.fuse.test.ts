/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { setup } from './helpers';

describe('autocomplete.suggest', () => {
  describe('FUSE', () => {
    // ToDo: Enable when FUSE is on tech preview
    it.skip('suggests FUSE in the general list of commands', async () => {
      const { suggest } = await setup();
      const suggestedCommands = (await suggest('FROM index | /')).map((s) => s.text);
      expect(suggestedCommands).toContain('FUSE ');
    });

    it('suggests pipe after complete command', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions('FROM a | FORK (LIMIT 1) (LIMIT 2) | FUSE /', ['| ']);
    });
  });
});
