/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setup, indexes, integrations } from './helpers';

const visibleIndices = indexes
  .filter(({ hidden }) => !hidden)
  .map(({ name }) => name)
  .sort();

describe('autocomplete.suggest', () => {
  describe('METRICS <sources> [ <aggregates> [ BY <grouping> ]]', () => {
    describe('METRICS ...', () => {
      test('suggests command on first character', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('m/');
        const hasCommand = !!suggestions.find((s) => s.label === 'metrics');

        expect(hasCommand).toBe(true);
      });
    });

    describe('... <sources> ...', () => {
      test('suggests visible indices on space', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('metrics /', visibleIndices);
        await assertSuggestions('METRICS /', visibleIndices);
        await assertSuggestions('metrics /index', visibleIndices);
      });

      test('suggests visible indices on comma', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('METRICS a,/', visibleIndices);
        await assertSuggestions('METRICS a, /', visibleIndices);
        await assertSuggestions('metrics *,/', visibleIndices);
      });

      test('can suggest integration data sources', async () => {
        const dataSources = [...indexes, ...integrations];
        const visibleDataSources = dataSources
          .filter(({ hidden }) => !hidden)
          .map(({ name }) => name)
          .sort();
        const { assertSuggestions, callbacks } = await setup();
        const cb = {
          ...callbacks,
          getSources: jest.fn().mockResolvedValue(dataSources),
        };

        assertSuggestions('metrics /', visibleDataSources, { callbacks: cb });
        assertSuggestions('METRICS /', visibleDataSources, { callbacks: cb });
        assertSuggestions('METRICS a,/', visibleDataSources, { callbacks: cb });
        assertSuggestions('metrics a, /', visibleDataSources, { callbacks: cb });
        assertSuggestions('metrics *,/', visibleDataSources, { callbacks: cb });
      });
    });
  });
});
