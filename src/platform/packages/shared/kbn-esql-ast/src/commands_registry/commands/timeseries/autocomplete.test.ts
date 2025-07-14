/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext } from '../../../__tests__/context_fixtures';
import { autocomplete } from './autocomplete';
import { expectSuggestions, getFieldNamesByType } from '../../../__tests__/autocomplete';
import { ICommandCallbacks } from '../../types';
import { correctQuerySyntax, findAstPosition } from '../../../definitions/utils/ast';
import { parse } from '../../../parser';
import { METADATA_FIELDS } from '../../options/metadata';

const metadataFields = [...METADATA_FIELDS].sort();

const tsExpectSuggestions = (
  query: string,
  expectedSuggestions: string[],
  mockCallbacks?: ICommandCallbacks,
  context = mockContext,
  offset?: number
) => {
  return expectSuggestions(
    query,
    expectedSuggestions,
    context,
    'ts',
    mockCallbacks,
    autocomplete,
    offset
  );
};

describe('TS Autocomplete', () => {
  let mockCallbacks: ICommandCallbacks;
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks before each test to ensure isolation
    mockCallbacks = {
      getByType: jest.fn(),
    };

    const expectedFields = getFieldNamesByType('any');
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
      expectedFields.map((name) => ({ label: name, text: name }))
    );
  });
  describe('... <sources> ...', () => {
    const suggest = async (query: string) => {
      const correctedQuery = correctQuerySyntax(query);
      const { ast } = parse(correctedQuery, { withFormatting: true });
      const cursorPosition = query.length;
      const { command } = findAstPosition(ast, cursorPosition);
      if (!command) {
        throw new Error('Command not found in the parsed query');
      }
      return autocomplete(query, command, mockCallbacks, mockContext, cursorPosition);
    };
    test('can suggest timeseries indices (and aliases)', async () => {
      const suggestions = await suggest('TS ');
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
      const suggestions = await suggest('TS ');
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
      const expected = ['METADATA ', ',', '| '].sort();

      await tsExpectSuggestions('ts time_series_index ', expected, mockCallbacks);
    });

    test('on <kbd>SPACE</kbd> after "METADATA" keyword suggests all metadata fields', async () => {
      await tsExpectSuggestions('from time_series_index METADATA /', metadataFields, mockCallbacks);
    });

    test('metadata field prefixes', async () => {
      await tsExpectSuggestions('ts time_series_index METADATA _', metadataFields, mockCallbacks);
      await tsExpectSuggestions(
        'ts time_series_index METADATA _sour',
        metadataFields,
        mockCallbacks
      );
    });

    test('on <kbd>SPACE</kbd> after "METADATA" column suggests command and pipe operators', async () => {
      await tsExpectSuggestions(
        'ts time_series_index metadata _index ',
        [',', '| '],
        mockCallbacks
      );
      await tsExpectSuggestions(
        'ts time_series_index metadata _index, _source ',
        [',', '| '],
        mockCallbacks
      );
      await tsExpectSuggestions(
        `ts time_series_index metadata ${METADATA_FIELDS.join(', ')} `,
        ['| '],
        mockCallbacks
      );
    });

    test('filters out already used metadata fields', async () => {
      await tsExpectSuggestions(
        'ts time_series_index metadata _index, ',
        metadataFieldsAndIndex,
        mockCallbacks
      );
    });
  });
});
