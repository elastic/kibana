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
  describe('<type> JOIN <index> [ AS <alias> ] ON <condition> [, <condition> [, ...]]', () => {
    describe('<type> JOIN ...', () => {
      test('suggests join commands', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('FROM index | /');
        const filtered = suggestions
          .filter((s) => s.label.includes('JOIN'))
          .map((s) => [s.label, s.text, s.detail]);

        expect(filtered.map((s) => s[0])).toEqual(['LOOKUP JOIN']);
        // expect(filtered.map((s) => s[0])).toEqual(['LEFT JOIN', 'RIGHT JOIN', 'LOOKUP JOIN']);
      });

      test('suggests command on first character', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('FROM index | LOOKUP J/');
        const filtered = suggestions.filter((s) => s.label.toUpperCase() === 'LOOKUP JOIN');

        expect(filtered[0].label).toBe('LOOKUP JOIN');
      });

      test('returns command description', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('FROM index | LOOKUP J/');
        const filtered = suggestions.filter((s) => s.label.toUpperCase() === 'LOOKUP JOIN');

        expect(filtered[0].label).toBe('LOOKUP JOIN');
        expect(filtered[0].detail).toBe('Join with a "lookup" mode index');
      });

      // test.only('suggests all command types', async () => {
      //   const { suggest } = await setup();

      //   const suggestions = await suggest('FROM index | L/');
      //   console.log(suggestions);
      //   const filtered = suggestions.filter((s) => s.label.toUpperCase() === 'LEFT JOIN');

      //   expect(filtered[0].label).toBe('LEFT JOIN');
      // });
    });

    describe('... <index> ...', () => {
      test('can suggest lookup indices', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('FROM index | LEFT JOIN /');
        const labels = suggestions.map((s) => s.label);

        expect(labels).toEqual([
          'join_index',
          'join_index_with_alias',
          'join_index_alias_1',
          'join_index_alias_2',
        ]);
      });

      test('discriminates between indices and aliases', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('FROM index | LEFT JOIN /');
        const labels = suggestions.map((s) => s.label);
      });
    });

    // describe('... = <alias> ...', () => {
    //   test('suggests "ON" command option', async () => {
    //     const { assertSuggestions } = await setup();

    //     await assertSuggestions('FROM index | FROM join_index AS abc /', ['ON']);
    //   });
    // });

    describe('... ON <condition>', () => {
      test('shows "ON" keyword suggestion', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('FROM index | LEFT JOIN /');
        const labels = suggestions.map((s) => s.label);
      });

      //   test('suggests comma after first condition was entered', async () => {
      //     const { assertSuggestions } = await setup();

      //     await assertSuggestions('FROM index | FROM join_index AS abc ON a = b/', [',']);
      //   });
    });

    // describe('... <index> ...', () => {
    //   test('suggests valid join indices', async () => {
    //     const { assertSuggestions } = await setup();

    //     await assertSuggestions('FROM index | LEFT JOIN /', joinIndices);
    //     await assertSuggestions('FROM index | right join /', joinIndices);
    //     await assertSuggestions('FROM index | RIGHT JOIN j/', joinIndices);
    //   });

    //   test('after index suggests "AS" expression', async () => {
    //     const { assertSuggestions } = await setup();

    //     await assertSuggestions('FROM index | FROM join_index /', ['AS']);
    //     // ...
    //   });

    //   test('suggests "ON" command option', async () => {
    //     const { assertSuggestions } = await setup();

    //     await assertSuggestions('FROM index | FROM join_index /', ['ON']);
    //   });
    // });
  });
});
