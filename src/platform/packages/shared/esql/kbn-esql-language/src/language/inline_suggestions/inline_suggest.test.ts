/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { inlineSuggest } from './inline_suggest';
import type { InlineSuggestionItem } from './types';

vi.mock('../../commands/registry/options/recommended_queries', () => {
  const mocked = {
    getRecommendedQueriesTemplates: vi.fn(),
    getTimeAndCategorizationFields: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../shared/columns_retrieval_helpers', () => {
  const mocked = {
    getColumnsByTypeRetriever: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./inline_suggestions_cache', () => {
  const mocked = {
    fromCache: vi.fn(),
    setToCache: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

import {
  getRecommendedQueriesTemplates,
  getTimeAndCategorizationFields,
} from '../../commands/registry/options/recommended_queries';
import { getColumnsByTypeRetriever } from '../shared/columns_retrieval_helpers';
import { setToCache } from './inline_suggestions_cache';

const mockGetRecommendedQueriesTemplates = getRecommendedQueriesTemplates as MockedFunction<
  typeof getRecommendedQueriesTemplates
>;
const mockGetTimeAndCategorizationFields = getTimeAndCategorizationFields as MockedFunction<
  typeof getTimeAndCategorizationFields
>;
const mockGetColumnsByTypeRetriever = getColumnsByTypeRetriever as MockedFunction<
  typeof getColumnsByTypeRetriever
>;

const mockSetToCache = setToCache as MockedFunction<typeof setToCache>;

describe('inlineSuggest', () => {
  const mockRange: InlineSuggestionItem['range'] = {
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: 1,
    endColumn: 10,
  };

  const mockCallbacks: ESQLCallbacks = {
    getSources: vi.fn(),
    getColumnsFor: vi.fn(),
    getEditorExtensions: vi.fn(),
    getHistoryStarredItems: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetTimeAndCategorizationFields.mockResolvedValue({
      timeField: '@timestamp',
      categorizationField: 'message',
    });
    mockGetRecommendedQueriesTemplates.mockReturnValue([
      {
        label: 'Search all fields',
        description: 'Use WHERE to filter/search data',
        queryString: 'FROM logs* | WHERE KQL("term")',
      },
    ]);
    mockGetColumnsByTypeRetriever.mockReturnValue({
      getColumnsByType: vi.fn(),
      getColumnMap: vi.fn(),
    });

    // Callbacks
    (mockCallbacks.getEditorExtensions as Mock).mockResolvedValue({
      recommendedQueries: [
        { query: 'FROM logs* | STATS count = COUNT(*)', name: 'Count aggregation' },
      ],
    });
    (mockCallbacks.getHistoryStarredItems as Mock).mockResolvedValue([
      'FROM logs* | WHERE host.name: "server1"',
      // break the query suggestion at same command
      `FROM test_logs | WHERE response: "error"\nAND status_code >= 500`,
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

  it('should return empty items when the editor is empty', async () => {
    const result = await inlineSuggest('', '', mockRange, mockCallbacks);

    expect(result).toEqual({ items: [] });
    expect(mockCallbacks.getEditorExtensions).not.toHaveBeenCalled();
  });

  it('should return empty items when the cursor is on a blank trailing line', async () => {
    const result = await inlineSuggest('FROM logs*\n', 'FROM logs*\n', mockRange, mockCallbacks);

    expect(result).toEqual({ items: [] });
    expect(mockCallbacks.getEditorExtensions).not.toHaveBeenCalled();
  });

  it('should return empty items when the cursor is on a // comment line', async () => {
    const result = await inlineSuggest(
      'FROM logs*\n// summarise per host',
      'FROM logs*\n// summarise per host',
      mockRange,
      mockCallbacks
    );

    expect(result).toEqual({ items: [] });
    expect(mockCallbacks.getEditorExtensions).not.toHaveBeenCalled();
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

  it('should suggest correct multiline queries with a break different than a pipe', async () => {
    const result = await inlineSuggest(
      'FROM test_logs',
      'FROM test_logs',
      mockRange,
      mockCallbacks
    );
    expect(result.items.length).toBeGreaterThan(0);
    expect(
      result.items.some((item) =>
        item.insertText.includes('WHERE response: "error" AND status_code')
      )
    ).toBe(true);
  });

  it('should remove duplicate suggestions', async () => {
    mockGetRecommendedQueriesTemplates.mockReturnValue([
      {
        label: 'Search all fields',
        description: 'Use WHERE to filter/search data',
        queryString: 'FROM logs* | WHERE KQL("term")',
      },
      {
        label: 'Search ...',
        description: '',
        queryString: 'FROM logs* | WHERE KQL("term")',
      },
      {
        label: 'Search all',
        description: '',
        queryString: 'FROM logs* | /* comment */ WHERE KQL("term")',
      },
      {
        label: 'Search all again',
        description: '',
        queryString: 'FROM logs* | WHERE KQL("term") // comment',
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
      },
      {
        label: 'Aggregate with STATS',
        description: '',
        queryString: 'FROM logs* | STATS count = COUNT(*)',
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
