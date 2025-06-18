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
      const expectedSuggestions = [
        'col0 = ',
        ...getFieldNamesByType('any').map((field) => field + ' '),
      ];
      await assertSuggestions('from a | rename /', expectedSuggestions);
      await assertSuggestions('from a | rename fie/', expectedSuggestions);
      await assertSuggestions('from a | rename field AS foo, /', expectedSuggestions);
      await assertSuggestions('from a | rename field = foo, /', expectedSuggestions);
      await assertSuggestions('from a | rename field AS foo, fie/', expectedSuggestions);
      await assertSuggestions('from a | rename field = foo, fie/', expectedSuggestions);
    });

    it('suggests AS after an existing field', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions('from a | rename textField /', ['AS ']);
      await assertSuggestions('from a | rename textField A/', ['AS ']);
      await assertSuggestions('from a | rename field AS foo, textField /', ['AS ']);
      await assertSuggestions('from a | rename field as foo , textField /', ['AS ']);
      await assertSuggestions('from a | rename field AS foo, textField A/', ['AS ']);
    });

    it('suggests = after a field that does not exist', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions('from a | rename field /', ['= ']);
      await assertSuggestions('from a | rename field AS foo, field /', ['= ']);
      await assertSuggestions('from a | rename field as foo , field /', ['= ']);
    });

    it('suggests nothing after AS', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions('from a | rename field AS /', []);
    });

    it('suggests fields after =', async () => {
      const { assertSuggestions } = await setup();

      await assertSuggestions(
        'from a | rename field = /',
        getFieldNamesByType('any').map((field) => field + ' ')
      );
    });

    it('suggests pipe and comma after complete expression', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions('from a | rename field AS foo /', ['| ', ', ']);
    });
  });
});
