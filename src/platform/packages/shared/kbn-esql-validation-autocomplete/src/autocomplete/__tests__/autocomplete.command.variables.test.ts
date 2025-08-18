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

    test('suggests `Create control` option for aggregations', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a | STATS /', {
        callbacks: {
          canSuggestVariables: () => true,
          getVariables: () => [],
          getColumnsFor: () => Promise.resolve([{ name: 'clientip', type: 'ip' }]),
        },
      });

      expect(suggestions).toContainEqual({
        label: 'Create control',
        text: '',
        kind: 'Issue',
        detail: 'Click to create',
        command: { id: 'esql.control.functions.create', title: 'Click to create' },
        sortText: '1',
      });
    });

    test('suggests `??function` option', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a | STATS col0 = /', {
        callbacks: {
          canSuggestVariables: () => true,
          getVariables: () => [
            {
              key: 'function',
              value: 'avg',
              type: ESQLVariableType.FUNCTIONS,
            },
          ],
          getColumnsFor: () => Promise.resolve([{ name: 'clientip', type: 'ip' }]),
        },
      });

      expect(suggestions).toContainEqual({
        label: '??function',
        text: '??function',
        kind: 'Constant',
        detail: 'Named parameter',
        command: undefined,
        sortText: '1A',
      });
    });

    test('suggests `Create control` option for grouping', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a | STATS BY /', {
        callbacks: {
          canSuggestVariables: () => true,
          getVariables: () => [],
          getColumnsFor: () => Promise.resolve([{ name: 'clientip', type: 'ip' }]),
        },
      });

      expect(suggestions).toContainEqual({
        label: 'Create control',
        text: '',
        kind: 'Issue',
        detail: 'Click to create',
        command: { id: 'esql.control.fields.create', title: 'Click to create' },
        sortText: '11',
      });
    });

    test('suggests `??field` option', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a | STATS BY /', {
        callbacks: {
          canSuggestVariables: () => true,
          getVariables: () => [
            {
              key: 'field',
              value: 'clientip',
              type: ESQLVariableType.FIELDS,
            },
          ],
          getColumnsFor: () => Promise.resolve([{ name: 'clientip', type: 'ip' }]),
        },
      });

      expect(suggestions).toContainEqual({
        label: '??field',
        text: '??field',
        kind: 'Constant',
        detail: 'Named parameter',
        command: undefined,
        sortText: '11A',
      });
    });

    test('suggests `?interval` option', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM index_a | STATS BY BUCKET(@timestamp, /)', {
        callbacks: {
          canSuggestVariables: () => true,
          getVariables: () => [
            {
              key: 'interval',
              value: '1 hour',
              type: ESQLVariableType.TIME_LITERAL,
            },
          ],
          getColumnsFor: () => Promise.resolve([{ name: '@timestamp', type: 'date' }]),
        },
      });

      expect(suggestions).toContainEqual({
        label: '?interval',
        text: '?interval',
        kind: 'Constant',
        detail: 'Named parameter',
        command: undefined,
        sortText: '1A',
      });
    });

    test('suggests `Create control` option when ? is being typed', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM index_b | STATS PERCENTILE(bytes, ?/)', {
        callbacks: {
          canSuggestVariables: () => true,
          getVariables: () => [],
          getColumnsFor: () => Promise.resolve([{ name: 'bytes', type: 'double' }]),
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
    });

    test('suggests `Create control` option', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM index_b | WHERE agent.name == /', {
        callbacks: {
          canSuggestVariables: () => true,
          getVariables: () => [],
          getColumnsFor: () => Promise.resolve([{ name: 'agent.name', type: 'keyword' }]),
        },
      });

      expect(suggestions).toContainEqual({
        label: 'Create control',
        text: '',
        kind: 'Issue',
        detail: 'Click to create',
        command: { id: 'esql.control.values.create', title: 'Click to create' },
        sortText: '11',
      });
    });

    test('suggests `?value` option', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM index_b | WHERE agent.name == /', {
        callbacks: {
          canSuggestVariables: () => true,
          getVariables: () => [
            {
              key: 'value',
              value: 'java',
              type: ESQLVariableType.VALUES,
            },
          ],
          getColumnsFor: () => Promise.resolve([{ name: 'agent.name', type: 'keyword' }]),
        },
      });

      expect(suggestions).toContainEqual({
        label: '?value',
        text: '?value',
        kind: 'Constant',
        detail: 'Named parameter',
        command: undefined,
        sortText: '11A',
      });
    });

    test('suggests `Create control` option when a questionmark is typed', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM index_b | WHERE agent.name == ?/', {
        callbacks: {
          canSuggestVariables: () => true,
          getVariables: () => [],
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
    });
  });
});
