/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext, integrations } from '../../../__tests__/context_fixtures';
import { autocomplete } from './autocomplete';
import { expectSuggestions, getFieldNamesByType } from '../../../__tests__/autocomplete';
import { ICommandCallbacks } from '../../types';
import { correctQuerySyntax, findAstPosition } from '../../../definitions/utils/ast';
import { parse } from '../../../parser';
import { getRecommendedQueriesTemplates } from '../../options/recommended_queries';
import { METADATA_FIELDS } from '../../options/metadata';

const metadataFields = [...METADATA_FIELDS].sort();

const fromExpectSuggestions = (
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
    'from',
    mockCallbacks,
    autocomplete,
    offset
  );
};

const visibleIndices =
  mockContext.sources?.filter((source) => !source.hidden).map((source) => source.name) || [];

const visibleIntegrations = integrations.map((name) => ({
  name,
  hidden: name.startsWith('.'),
  type: 'Integration',
}));
const visibleDataSources = [...(mockContext.sources ?? []), ...visibleIntegrations].filter(
  (source) => !source.hidden
);

describe('FROM Autocomplete', () => {
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
    test('suggests visible indices on space', async () => {
      await fromExpectSuggestions('from /', visibleIndices, mockCallbacks);
      await fromExpectSuggestions('FROM /', visibleIndices, mockCallbacks);
      await fromExpectSuggestions('from /index', visibleIndices, mockCallbacks);
    });

    test("doesn't create suggestions after an open quote", async () => {
      await fromExpectSuggestions('FROM " "', [], mockCallbacks, mockContext, 6);
    });

    test('does create suggestions after a closed quote', async () => {
      await fromExpectSuggestions('FROM "lolz", ', visibleIndices, mockCallbacks);
    });

    test('doesnt suggest indices twice', async () => {
      await fromExpectSuggestions(
        'from index, ',
        visibleIndices.filter((i) => i !== 'index'),
        mockCallbacks
      );
    });

    test('suggests comma or pipe after complete index name', async () => {
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
      const suggestions = (await suggest('from index')).map((s) => s.text);
      expect(suggestions).toContain('index, ');
      expect(suggestions).toContain('index | ');

      const suggestions2 = (await suggest('from index, "my-index"')).map((s) => s.text);

      expect(suggestions2).toContain('"my-index", ');
      expect(suggestions2).toContain('"my-index" | ');
    });

    test('can suggest integration data sources', async () => {
      const expectedSuggestions = visibleDataSources.map((source) => source.name);
      mockContext.sources = visibleDataSources;

      await fromExpectSuggestions('from ', expectedSuggestions, mockCallbacks);
      await fromExpectSuggestions('FROM ', expectedSuggestions, mockCallbacks);
      await fromExpectSuggestions(
        'FROM a,/',
        expectedSuggestions.filter((i) => i !== 'a'),
        mockCallbacks
      );
      await fromExpectSuggestions(
        'from a, /',
        expectedSuggestions.filter((i) => i !== 'a'),
        mockCallbacks
      );
      await fromExpectSuggestions('from *,/', expectedSuggestions, mockCallbacks);
    });
  });

  describe('... METADATA <fields>', () => {
    const metadataFieldsAndIndex = metadataFields.filter((field) => field !== '_index');

    test('on <// FROM something METADATA field1, /kbd>SPACE</kbd> without comma ",", suggests adding metadata', async () => {
      const recommendedQueries = getRecommendedQueriesTemplates({
        fromCommand: '',
        timeField: '@timestamp',
        categorizationField: 'keywordField',
      });
      const expected = [
        'METADATA ',
        ',',
        '| ',
        ...recommendedQueries.map((query) => query.queryString),
      ].sort();

      await fromExpectSuggestions('from a, b ', expected, mockCallbacks);
    });

    test('partially-typed METADATA keyword', async () => {
      await fromExpectSuggestions('FROM index1 MET', ['METADATA '], mockCallbacks);
    });

    test('not before first index', async () => {
      mockContext.sources = visibleDataSources;
      await fromExpectSuggestions(
        'FROM MET',
        visibleDataSources.map((source) => source.name),
        mockCallbacks
      );
    });

    test('on <kbd>SPACE</kbd> after "METADATA" keyword suggests all metadata fields', async () => {
      await fromExpectSuggestions('from a, b METADATA ', metadataFields, mockCallbacks);
    });

    test('metadata field prefixes', async () => {
      await fromExpectSuggestions('from a, b METADATA _', metadataFields, mockCallbacks);
      await fromExpectSuggestions('from a, b METADATA _sour', metadataFields, mockCallbacks);
    });

    test('on <kbd>SPACE</kbd> after "METADATA" column suggests command and pipe operators', async () => {
      await fromExpectSuggestions('from a, b metadata _index ', [',', '| '], mockCallbacks);
      await fromExpectSuggestions(
        'from a, b metadata _index, _source ',
        [',', '| '],
        mockCallbacks
      );
      await fromExpectSuggestions(
        `from a, b metadata ${METADATA_FIELDS.join(', ')} `,
        ['| '],
        mockCallbacks
      );
    });

    test('filters out already used metadata fields', async () => {
      await fromExpectSuggestions(
        'from a, b metadata _index, ',
        metadataFieldsAndIndex,
        mockCallbacks
      );
    });
  });
});
