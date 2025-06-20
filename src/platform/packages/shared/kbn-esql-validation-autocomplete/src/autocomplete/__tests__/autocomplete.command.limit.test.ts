/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQLVariableType } from '@kbn/esql-types';
import { setup } from './helpers';

describe('autocomplete.suggest', () => {
  describe('LIMIT <number>', () => {
    test('suggests numbers', async () => {
      const { assertSuggestions } = await setup();
      assertSuggestions('from a | limit /', ['10 ', '100 ', '1000 ']);
      assertSuggestions('from a | limit /', ['10 ', '100 ', '1000 '], { triggerCharacter: ' ' });
    });

    test('suggests pipe after number', async () => {
      const { assertSuggestions } = await setup();
      assertSuggestions('from a | limit 4 /', ['| ']);
    });
  });

  describe('create control suggestion', () => {
    test('suggests `Create control` option if questionmark is typed', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a | LIMIT ?/', {
        callbacks: {
          canSuggestVariables: () => true,
          getVariables: () => [
            {
              key: 'value',
              value: 10,
              type: ESQLVariableType.VALUES,
            },
          ],
          getColumnsFor: () => Promise.resolve([{ name: 'agent.name', type: 'keyword' }]),
        },
      });

      expect(suggestions).toContainEqual({
        label: 'Create control',
        text: '',
        kind: 'Issue',
        detail: 'Click to create',
        command: { id: 'esql.control.values.create', title: 'Click to create' },
        sortText: '1',
      });

      expect(suggestions).toContainEqual({
        label: 'value',
        text: 'value',
        kind: 'Constant',
        detail: 'Named parameter',
        command: undefined,
        sortText: '1A',
      });
    });
  });
});
