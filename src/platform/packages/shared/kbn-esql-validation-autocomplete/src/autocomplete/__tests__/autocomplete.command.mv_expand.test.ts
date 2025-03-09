/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFieldNamesByType, setup } from './helpers';

describe('autocomplete.suggest', () => {
  describe('MV_EXPAND <column>', () => {
    it('suggests columns', async () => {
      const { assertSuggestions } = await setup();
      assertSuggestions(
        'from a | mv_expand /',
        getFieldNamesByType('any').map((name) => `${name} `)
      );
      assertSuggestions(
        'from a | mv_expand /',
        getFieldNamesByType('any').map((name) => `${name} `),
        {
          triggerCharacter: ' ',
        }
      );
    });

    it('works with field name prefixes', async () => {
      const { assertSuggestions } = await setup();
      assertSuggestions(
        'from a | mv_expand key/',
        getFieldNamesByType('any').map((name) => `${name} `)
      );
      assertSuggestions(
        'from a | mv_expand keywordField/',
        getFieldNamesByType('any').map((name) => `${name} `)
      );
    });

    it('suggests pipe after column', async () => {
      const { assertSuggestions } = await setup();
      assertSuggestions('from a | mv_expand a /', ['| ']);
    });
  });
});
