/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METADATA_FIELDS } from '../../shared/constants';
import { setup, indexes, integrations } from './helpers';

const visibleIndices = indexes
  .filter(({ hidden }) => !hidden)
  .map(({ name, suggestedAs }) => suggestedAs || name)
  .sort();

const metadataFields = [...METADATA_FIELDS].sort();

describe('autocomplete.suggest', () => {
  describe('FROM <sources> [ METADATA <fields> ]', () => {
    describe('FROM ...', () => {
      test('suggests command on first character', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('f/');
        const hasCommand = !!suggestions.find((s) => s.label.toUpperCase() === 'FROM');

        expect(hasCommand).toBe(true);
      });
    });

    describe('... <sources> ...', () => {
      test('suggests visible indices on space', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from /', visibleIndices);
        await assertSuggestions('FROM /', visibleIndices);
        await assertSuggestions('from /index', visibleIndices);
      });

      test('suggests visible indices on comma', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('FROM a,/', visibleIndices);
        await assertSuggestions('FROM a, /', visibleIndices);
        await assertSuggestions('from *,/', visibleIndices);
      });

      test('can suggest integration data sources', async () => {
        const dataSources = indexes.concat(integrations);
        const visibleDataSources = dataSources
          .filter(({ hidden }) => !hidden)
          .map(({ name, suggestedAs }) => suggestedAs || name)
          .sort();
        const expectedSuggestions = visibleDataSources;
        const { assertSuggestions, callbacks } = await setup();
        const cb = {
          ...callbacks,
          getSources: jest.fn().mockResolvedValue(dataSources),
        };

        await assertSuggestions('from /', expectedSuggestions, { callbacks: cb });
        await assertSuggestions('FROM /', expectedSuggestions, { callbacks: cb });
        await assertSuggestions('FROM a,/', expectedSuggestions, { callbacks: cb });
        await assertSuggestions('from a, /', expectedSuggestions, { callbacks: cb });
        await assertSuggestions('from *,/', expectedSuggestions, { callbacks: cb });
      });
    });

    describe('... METADATA <fields>', () => {
      const metadataFieldsAndIndex = metadataFields.filter((field) => field !== '_index');

      test('on <kbd>SPACE</kbd> without comma ",", suggests adding metadata', async () => {
        const { assertSuggestions } = await setup();
        const expected = ['METADATA $0', ',', '| '].sort();

        await assertSuggestions('from a, b /', expected);
      });

      test('on <kbd>SPACE</kbd> after "METADATA" keyword suggests all metadata fields', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a, b [METADATA /]', metadataFields);
        await assertSuggestions('from a, b METADATA /', metadataFields);
      });

      test('on <kbd>SPACE</kbd> after "METADATA" column suggests command and pipe operators', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a, b [metadata _index  /]', [',', '| ']);
        await assertSuggestions('from a, b metadata _index /', [',', '| ']);
        await assertSuggestions('from a, b metadata _index, _source /', [',', '| ']);
        await assertSuggestions(`from a, b metadata ${METADATA_FIELDS.join(', ')} /`, ['| ']);
      });

      test('filters out already used metadata fields', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a, b [metadata _index, /]', metadataFieldsAndIndex);
        await assertSuggestions('from a, b metadata _index, /', metadataFieldsAndIndex);
      });
    });
  });
});
