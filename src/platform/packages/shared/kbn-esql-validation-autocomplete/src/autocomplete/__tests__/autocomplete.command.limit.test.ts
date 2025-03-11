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
  describe('LIMIT <number>', () => {
    it('suggests numbers', async () => {
      const { assertSuggestions } = await setup();
      assertSuggestions('from a | limit /', ['10 ', '100 ', '1000 ']);
      assertSuggestions('from a | limit /', ['10 ', '100 ', '1000 '], { triggerCharacter: ' ' });
    });

    it('suggests pipe after number', async () => {
      const { assertSuggestions } = await setup();
      assertSuggestions('from a | limit 4 /', ['| ']);
    });
  });
});
