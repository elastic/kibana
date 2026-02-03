/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { SHOW_FIELD_STATISTICS } from '@kbn/discover-utils';
import { buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { isFieldStatsMode } from './is_field_stats_mode';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';

const dataViewMock = buildDataViewMock({ name: 'test-data-view' });

const createMockUiSettings = (showFieldStats: boolean): IUiSettingsClient => {
  return {
    get: jest.fn((key: string) => {
      if (key === SHOW_FIELD_STATISTICS) {
        return showFieldStats;
      }
      return undefined;
    }),
  } as unknown as IUiSettingsClient;
};

const createMockSavedSearch = (viewMode: VIEW_MODE, columns: string[] | undefined): SavedSearch => {
  return {
    viewMode,
    columns,
    searchSource: {
      getField: jest.fn((field: string) => {
        if (field === 'query') {
          return { language: 'kuery' }; // Default to non-ES|QL query
        }
        return undefined;
      }),
    },
  } as unknown as SavedSearch;
};

const columns = ['field1', 'field2'];

describe('isFieldStatsMode', () => {
  describe('DOCUMENT_LEVEL mode', () => {
    it('should return false when in DOCUMENT_LEVEL view mode', () => {
      const savedSearch = createMockSavedSearch(VIEW_MODE.DOCUMENT_LEVEL, columns);
      const uiSettings = createMockUiSettings(false);

      expect(isFieldStatsMode(savedSearch, dataViewMock, uiSettings)).toBe(false);
    });
  });

  describe('AGGREGATED_LEVEL mode (Field Statistics)', () => {
    it('should return true when all Field Statistics conditions are met', () => {
      const savedSearch = createMockSavedSearch(VIEW_MODE.AGGREGATED_LEVEL, columns);
      const uiSettings = createMockUiSettings(true);

      expect(isFieldStatsMode(savedSearch, dataViewMock, uiSettings)).toBe(true);
    });

    it('should return false when SHOW_FIELD_STATISTICS setting is false', () => {
      const savedSearch = createMockSavedSearch(VIEW_MODE.AGGREGATED_LEVEL, columns);
      const uiSettings = createMockUiSettings(false);

      expect(isFieldStatsMode(savedSearch, dataViewMock, uiSettings)).toBe(false);
    });

    it('should return false when dataView is undefined', () => {
      const savedSearch = createMockSavedSearch(VIEW_MODE.AGGREGATED_LEVEL, columns);
      const uiSettings = createMockUiSettings(true);

      expect(isFieldStatsMode(savedSearch, undefined, uiSettings)).toBe(false);
    });

    it('should return false when columns is not an array', () => {
      const savedSearch = createMockSavedSearch(VIEW_MODE.AGGREGATED_LEVEL, undefined);
      const uiSettings = createMockUiSettings(true);

      expect(isFieldStatsMode(savedSearch, dataViewMock, uiSettings)).toBe(false);
    });

    it('should return true when columns is an empty array', () => {
      const savedSearch = createMockSavedSearch(VIEW_MODE.AGGREGATED_LEVEL, []);
      const uiSettings = createMockUiSettings(true);

      expect(isFieldStatsMode(savedSearch, dataViewMock, uiSettings)).toBe(true);
    });
  });
});
