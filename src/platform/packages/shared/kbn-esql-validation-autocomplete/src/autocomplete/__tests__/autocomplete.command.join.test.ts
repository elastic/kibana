/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup, getFieldNamesByType, lookupIndexFields } from './helpers';

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

        // TODO: Uncomment when other join types are implemented
        // expect(filtered.map((s) => s[0])).toEqual(['LEFT JOIN', 'RIGHT JOIN', 'LOOKUP JOIN']);
      });

      test('can infer full command name based on the unique command type', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('FROM index | LOOKU/');
        const filtered = suggestions.filter((s) => s.label.toUpperCase() === 'LOOKUP JOIN');

        expect(filtered[0].label).toBe('LOOKUP JOIN');
      });

      test('suggests command on first character', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('FROM index | LOOKUP J/');
        const filtered = suggestions.filter((s) => s.label.toUpperCase() === 'LOOKUP JOIN');

        expect(filtered[0].label).toBe('LOOKUP JOIN');
      });

      test('returns command description, correct type, and suggestion continuation', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('FROM index | LOOKUP J/');

        expect(suggestions[0]).toMatchObject({
          label: 'LOOKUP JOIN',
          text: 'LOOKUP JOIN $0',
          detail: 'Join with a "lookup" mode index',
          kind: 'Keyword',
        });
      });
    });

    describe('... <index> ...', () => {
      test('can suggest lookup indices (and aliases)', async () => {
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
        const indices: string[] = suggestions
          .filter((s) => s.detail === 'Index')
          .map((s) => s.label)
          .sort();
        const aliases: string[] = suggestions
          .filter((s) => s.detail === 'Alias')
          .map((s) => s.label)
          .sort();

        expect(indices).toEqual(['join_index', 'join_index_with_alias']);
        expect(aliases).toEqual(['join_index_alias_1', 'join_index_alias_2']);
      });
    });

    describe('... ON <condition>', () => {
      test('shows "ON" keyword suggestion', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('FROM index | LOOKUP JOIN join_index /');
        const labels = suggestions.map((s) => s.label);

        expect(labels).toEqual(['ON']);
      });

      test('suggests fields after ON keyword', async () => {
        const { suggest } = await setup();
        const suggestions = await suggest('FROM index | LOOKUP JOIN join_index ON /');
        const labels = suggestions.map((s) => s.text.trim()).sort();
        const expected = getFieldNamesByType('any')
          .sort()
          .map((field) => field.trim());

        for (const { name } of lookupIndexFields) {
          expected.push(name.trim());
        }

        expected.sort();

        expect(labels).toEqual(expected);
      });

      test('more field suggestions after comma', async () => {
        const { suggest } = await setup();
        const suggestions = await suggest('FROM index | LOOKUP JOIN join_index ON stringField, /');
        const labels = suggestions.map((s) => s.text.trim()).sort();
        const expected = getFieldNamesByType('any')
          .sort()
          .map((field) => field.trim());

        for (const { name } of lookupIndexFields) {
          expected.push(name.trim());
        }

        expected.sort();

        expect(labels).toEqual(expected);
      });

      test('suggests pipe and comma after a field', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('FROM index | LOOKUP JOIN join_index ON stringField /');
        const labels = suggestions.map((s) => s.label).sort();

        expect(labels).toEqual([',', '|']);
      });

      test('suggests pipe and comma after a field (no space)', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('FROM index | LOOKUP JOIN join_index ON stringField/');
        const labels = suggestions.map((s) => s.label).sort();

        expect(labels).toEqual([',', '|']);
      });
    });
  });
});
