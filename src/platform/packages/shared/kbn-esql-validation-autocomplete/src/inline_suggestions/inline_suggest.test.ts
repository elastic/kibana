/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inlineSuggest } from './inline_suggest';
import type { ESQLCallbacks } from '../shared/types';
import type { InlineSuggestionItem } from './types';

jest.mock('@kbn/esql-ast/src/commands_registry/options/recommended_queries', () => ({
  getRecommendedQueriesTemplates: jest.fn(),
  getTimeAndCategorizationFields: jest.fn(),
}));

jest.mock('../shared/columns', () => ({
  getColumnsByTypeRetriever: jest.fn(),
}));

jest.mock('./inline_suggestions_cache', () => ({
  fromCache: jest.fn(),
  setToCache: jest.fn(),
}));

import {
  getRecommendedQueriesTemplates,
  getTimeAndCategorizationFields,
} from '@kbn/esql-ast/src/commands_registry/options/recommended_queries';
import { getColumnsByTypeRetriever } from '../shared/columns';
import { setToCache } from './inline_suggestions_cache';

const mockGetRecommendedQueriesTemplates = getRecommendedQueriesTemplates as jest.MockedFunction<
  typeof getRecommendedQueriesTemplates
>;
const mockGetTimeAndCategorizationFields = getTimeAndCategorizationFields as jest.MockedFunction<
  typeof getTimeAndCategorizationFields
>;
const mockGetColumnsByTypeRetriever = getColumnsByTypeRetriever as jest.MockedFunction<
  typeof getColumnsByTypeRetriever
>;

const mockSetToCache = setToCache as jest.MockedFunction<typeof setToCache>;

describe('inlineSuggest', () => {
  const mockRange: InlineSuggestionItem['range'] = {
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: 1,
    endColumn: 10,
  };

  const mockCallbacks: ESQLCallbacks = {
    getSources: jest.fn(),
    getColumnsFor: jest.fn(),
    getEditorExtensions: jest.fn(),
    getHistoryStarredItems: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetTimeAndCategorizationFields.mockResolvedValue({
      timeField: '@timestamp',
      categorizationField: 'message',
    });
    mockGetRecommendedQueriesTemplates.mockReturnValue([
      {
        label: 'Search all fields',
        description: 'Use WHERE to filter/search data',
        queryString: 'FROM logs* | WHERE KQL("term")',
        sortText: 'D',
      },
    ]);
    mockGetColumnsByTypeRetriever.mockReturnValue({
      getColumnsByType: jest.fn(),
      getColumnMap: jest.fn(),
    });

    // Callbacks
    (mockCallbacks.getEditorExtensions as jest.Mock).mockResolvedValue({
      recommendedQueries: [
        { query: 'FROM logs* | STATS count = COUNT(*)', name: 'Count aggregation' },
      ],
    });
    (mockCallbacks.getHistoryStarredItems as jest.Mock).mockResolvedValue([
      'FROM logs* | WHERE host.name: "server1"',
    ]);
  });

  it('should return empty items when cursor is not at the end of the query', async () => {
    const result = await inlineSuggest(
      'FROM logs* | WHERE field = "value"',
      'FROM logs*',
      mockRange,
      mockCallbacks
    );

    expect(result).toEqual({ items: [] });
  });

  it('should return suggestions when cursor is at the end of the query', async () => {
    const result = await inlineSuggest('FROM logs*', 'FROM logs*', mockRange, mockCallbacks);

    expect(result.items.length).toBeGreaterThan(0);
    const suggestions = result.items.map((item) => item.insertText);
    expect(suggestions.some((text) => text.includes('STATS'))).toBe(true);
  });

  it('should cache field information after fetching', async () => {
    await inlineSuggest('FROM logs*', 'FROM logs*', mockRange, mockCallbacks);

    expect(mockSetToCache).toHaveBeenCalled();
    // Verify cache was called with field information
    const calls = mockSetToCache.mock.calls;
    const fieldCacheCall = calls.find(
      (call) =>
        typeof call[1] === 'object' &&
        call[1] &&
        'timeField' in call[1] &&
        'categorizationField' in call[1]
    );
    expect(fieldCacheCall).toBeDefined();
  });

  it('should cache template suggestions after generating', async () => {
    await inlineSuggest('FROM logs*', 'FROM logs*', mockRange, mockCallbacks);

    expect(mockSetToCache).toHaveBeenCalled();
    // Verify cache was called with template information
    const calls = mockSetToCache.mock.calls;
    const templateCacheCall = calls.find((call) => Array.isArray(call[1]));
    expect(templateCacheCall).toBeDefined();
  });

  it('should remove duplicate suggestions', async () => {
    mockGetRecommendedQueriesTemplates.mockReturnValue([
      {
        label: 'Search all fields',
        description: 'Use WHERE to filter/search data',
        queryString: 'FROM logs* | WHERE KQL("term")',
        sortText: 'D',
      },
      {
        label: 'Search ...',
        description: '',
        queryString: 'FROM logs* | WHERE KQL("term")',
        sortText: 'D',
      },
    ]);
    const result = await inlineSuggest('FROM logs*', 'FROM logs*', mockRange, mockCallbacks);

    const suggestions = result.items.map((item) => item.insertText);
    expect(suggestions.filter((text) => text.includes('WHERE KQL("term")')).length).toBe(1);
  });

  it('should not suggest same text as the query', async () => {
    mockGetRecommendedQueriesTemplates.mockReturnValue([
      {
        label: 'Search all fields',
        description: 'Use WHERE to filter/search data',
        queryString: 'FROM logs* | WHERE KQL("term")',
        sortText: 'D',
      },
      {
        label: 'Aggregate with STATS',
        description: '',
        queryString: 'FROM logs* | STATS count = COUNT(*)',
        sortText: 'D',
      },
    ]);
    const result = await inlineSuggest(
      'FROM logs* | WHERE KQL("term")',
      'FROM logs* | WHERE KQL("term")',
      mockRange,
      mockCallbacks
    );

    const suggestions = result.items.map((item) => item.insertText);
    expect(suggestions.filter((text) => text.includes('WHERE KQL("term")')).length).toBe(0);
  });
});
