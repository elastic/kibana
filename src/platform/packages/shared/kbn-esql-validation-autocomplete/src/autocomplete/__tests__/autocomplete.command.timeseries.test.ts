/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METADATA_FIELDS } from '@kbn/esql-ast';
import { setup } from './helpers';

const metadataFields = [...METADATA_FIELDS].sort();

describe('autocomplete.suggest', () => {
  describe('TS <sources> [ METADATA <fields> ]', () => {
    describe.skip('TS ...', () => {
      // ToDo: Enable when TS is on technical preview
      test('suggests command on first character', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('f/');
        const hasCommand = !!suggestions.find((s) => s.label.toUpperCase() === 'TS');

        expect(hasCommand).toBe(true);
      });
    });

    describe('... <sources> ...', () => {
      test('can suggest timeseries indices (and aliases)', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('TS /');
        const labels = suggestions.map((s) => s.label);

        expect(labels).toEqual([
          'timeseries_index',
          'timeseries_index_with_alias',
          'time_series_index',
          'timeseries_index_alias_1',
          'timeseries_index_alias_2',
        ]);
      });

      test('discriminates between indices and aliases', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('TS /');
        const indices: string[] = suggestions
          .filter((s) => s.detail === 'Index')
          .map((s) => s.label)
          .sort();
        const aliases: string[] = suggestions
          .filter((s) => s.detail === 'Alias')
          .map((s) => s.label)
          .sort();

        expect(indices).toEqual([
          'time_series_index',
          'timeseries_index',
          'timeseries_index_with_alias',
        ]);
        expect(aliases).toEqual(['timeseries_index_alias_1', 'timeseries_index_alias_2']);
      });
    });

    describe('... METADATA <fields>', () => {
      const metadataFieldsAndIndex = metadataFields.filter((field) => field !== '_index');

      test('on <// TS index METADATA field1, /kbd>SPACE</kbd> without comma ",", suggests adding metadata', async () => {
        const { assertSuggestions } = await setup();
        const expected = ['METADATA ', ',', '| '].sort();

        await assertSuggestions('ts a, b /', expected);
      });

      test('partially-typed METADATA keyword', async () => {
        const { assertSuggestions } = await setup();

        assertSuggestions('TS index1 MET/', ['METADATA ']);
      });

      test('on <kbd>SPACE</kbd> after "METADATA" keyword suggests all metadata fields', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a, b METADATA /', metadataFields);
      });

      test('metadata field prefixes', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a, b METADATA _/', metadataFields);
        await assertSuggestions('from a, b METADATA _sour/', metadataFields);
      });

      test('on <kbd>SPACE</kbd> after "METADATA" column suggests command and pipe operators', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a, b metadata _index /', [',', '| ']);
        await assertSuggestions('from a, b metadata _index, _source /', [',', '| ']);
        await assertSuggestions(`from a, b metadata ${METADATA_FIELDS.join(', ')} /`, ['| ']);
      });

      test('filters out already used metadata fields', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a, b metadata _index, /', metadataFieldsAndIndex);
      });
    });
  });
});
