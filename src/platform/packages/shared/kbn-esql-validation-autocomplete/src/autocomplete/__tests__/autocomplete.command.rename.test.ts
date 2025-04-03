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
  describe('RENAME', () => {
    it('suggests fields', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions(
        'from a | rename /',
        getFieldNamesByType('any').map((field) => field + ' ')
      );
      await assertSuggestions(
        'from a | rename fie/',
        getFieldNamesByType('any').map((field) => field + ' ')
      );
      await assertSuggestions(
        'from a | rename field AS foo, /',
        getFieldNamesByType('any').map((field) => field + ' ')
      );
      await assertSuggestions(
        'from a | rename field AS foo, fie/',
        getFieldNamesByType('any').map((field) => field + ' ')
      );
    });

    it('suggests AS after field', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions('from a | rename field /', ['AS ']);
      await assertSuggestions('from a | rename field A/', ['AS ']);
      await assertSuggestions('from a | rename field AS foo, field2 /', ['AS ']);
      await assertSuggestions('from a | rename field as foo , field2 /', ['AS ']);
      await assertSuggestions('from a | rename field AS foo, field2 A/', ['AS ']);
    });

    it('suggests nothing after AS', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions('from a | rename field AS /', []);
    });

    it('suggests pipe and comma after complete expression', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions('from a | rename field AS foo /', ['| ', ', ']);
    });
  });
});
