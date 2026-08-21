/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { isPatternAnalysisMode } from './is_pattern_analysis_mode';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';

const dataViewMock = buildDataViewMock({ name: 'test-data-view' });

const createMockSavedSearch = (
  viewMode: VIEW_MODE,
  query: { language: string; esql?: string } = { language: 'kuery' }
): SavedSearch => {
  return {
    viewMode,
    searchSource: {
      getField: jest.fn((field: string) => {
        if (field === 'query') {
          return query;
        }
        return undefined;
      }),
    },
  } as unknown as SavedSearch;
};

describe('isPatternAnalysisMode', () => {
  it('should return false when in DOCUMENT_LEVEL view mode', () => {
    const savedSearch = createMockSavedSearch(VIEW_MODE.DOCUMENT_LEVEL);

    expect(isPatternAnalysisMode(savedSearch, dataViewMock)).toBe(false);
  });

  it('should return false when in AGGREGATED_LEVEL view mode', () => {
    const savedSearch = createMockSavedSearch(VIEW_MODE.AGGREGATED_LEVEL);

    expect(isPatternAnalysisMode(savedSearch, dataViewMock)).toBe(false);
  });

  it('should return true when in PATTERN_LEVEL view mode', () => {
    const savedSearch = createMockSavedSearch(VIEW_MODE.PATTERN_LEVEL);

    expect(isPatternAnalysisMode(savedSearch, dataViewMock)).toBe(true);
  });

  it('should return false when dataView is undefined', () => {
    const savedSearch = createMockSavedSearch(VIEW_MODE.PATTERN_LEVEL);

    expect(isPatternAnalysisMode(savedSearch, undefined)).toBe(false);
  });

  it('should return false when in PATTERN_LEVEL view mode but the query is ES|QL', () => {
    const savedSearch = createMockSavedSearch(VIEW_MODE.PATTERN_LEVEL, {
      language: 'esql',
      esql: 'FROM kibana_sample_data_logs | LIMIT 1',
    });

    expect(isPatternAnalysisMode(savedSearch, dataViewMock)).toBe(false);
  });
});
