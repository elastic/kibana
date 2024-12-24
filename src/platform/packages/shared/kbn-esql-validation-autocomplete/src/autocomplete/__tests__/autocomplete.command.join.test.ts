/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';

const joinIndices = ['join_index', 'join_index_with_alias'];

describe('autocomplete.suggest', () => {
  describe('<type> JOIN <index> [ AS <alias> ] ON <condition> [, <condition> [, ...]]', () => {
    describe('<type> ...', () => {
      test('suggests command on first character', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('FROM index | LEFT J/');
        const hasCommand = !!suggestions.find((s) => s.label.toUpperCase() === 'JOIN');

        expect(hasCommand).toBe(true);
      });
    });

    describe('... <index> ...', () => {
      test('suggests valid join indices', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('FROM index | LEFT JOIN /', joinIndices);
        await assertSuggestions('FROM index | right join /', joinIndices);
        await assertSuggestions('FROM index | RIGHT JOIN j/', joinIndices);
      });

      test('after index suggests "AS" expression', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('FROM index | FROM join_index /', ['AS']);
        // ...
      });

      test('suggests "ON" command option', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('FROM index | FROM join_index /', ['ON']);
      });
    });

    describe('... = <alias> ...', () => {
      test('suggests "ON" command option', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('FROM index | FROM join_index AS abc /', ['ON']);
      });
    });

    describe('... ON <condition>', () => {
      test('suggests comma after first condition was entered', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('FROM index | FROM join_index AS abc ON a = b/', [',']);
      });
    });
  });
});
