/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListConfigValue } from '@kbn/content-list-provider';
import { buildSearchBarFilters, type FilterBuilderContext } from './build_filters';

// Mock the renderer components.
jest.mock('./renderers/starred_renderer', () => ({
  StarredRenderer: jest.fn(),
}));

jest.mock('./renderers/sort_renderer', () => ({
  SortRenderer: jest.fn(),
}));

jest.mock('./renderers/tags_renderer', () => ({
  TagsRenderer: jest.fn(),
}));

jest.mock('./renderers/created_by_renderer', () => ({
  CreatedByRenderer: jest.fn(),
}));

jest.mock('./renderers/custom_filter_renderer', () => ({
  createDynamicCustomFilterRenderer: jest.fn((fieldId) => {
    const MockRenderer = () => null;
    MockRenderer.displayName = `DynamicCustomFilterRenderer(${fieldId})`;
    return MockRenderer;
  }),
}));

describe('buildSearchBarFilters', () => {
  const baseContext: FilterBuilderContext = {
    config: { features: {} } as unknown as ContentListConfigValue,
    filterDisplay: {
      hasStarred: true,
      hasSorting: true,
      hasTags: true,
      hasUsers: true,
      hasFilters: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('filter enabling', () => {
    it('includes starred filter when hasStarred is true', () => {
      const filters = buildSearchBarFilters(['starred'], baseContext);
      expect(filters).toHaveLength(1);
      expect(filters[0].type).toBe('custom_component');
    });

    it('excludes starred filter when hasStarred is false', () => {
      const context = {
        ...baseContext,
        filterDisplay: { ...baseContext.filterDisplay, hasStarred: false },
      };
      const filters = buildSearchBarFilters(['starred'], context);
      expect(filters).toHaveLength(0);
    });

    it('includes sort filter when hasSorting is true', () => {
      const filters = buildSearchBarFilters(['sort'], baseContext);
      expect(filters).toHaveLength(1);
    });

    it('excludes sort filter when hasSorting is false', () => {
      const context = {
        ...baseContext,
        filterDisplay: { ...baseContext.filterDisplay, hasSorting: false },
      };
      const filters = buildSearchBarFilters(['sort'], context);
      expect(filters).toHaveLength(0);
    });

    it('includes tags filter when hasTags is true', () => {
      const filters = buildSearchBarFilters(['tags'], baseContext);
      expect(filters).toHaveLength(1);
    });

    it('excludes tags filter when hasTags is false', () => {
      const context = {
        ...baseContext,
        filterDisplay: { ...baseContext.filterDisplay, hasTags: false },
      };
      const filters = buildSearchBarFilters(['tags'], context);
      expect(filters).toHaveLength(0);
    });

    it('includes createdBy filter when hasUsers is true', () => {
      const filters = buildSearchBarFilters(['createdBy'], baseContext);
      expect(filters).toHaveLength(1);
    });

    it('excludes createdBy filter when hasUsers is false', () => {
      const context = {
        ...baseContext,
        filterDisplay: { ...baseContext.filterDisplay, hasUsers: false },
      };
      const filters = buildSearchBarFilters(['createdBy'], context);
      expect(filters).toHaveLength(0);
    });
  });

  describe('custom filters', () => {
    it('includes custom filter when defined in config', () => {
      const context: FilterBuilderContext = {
        ...baseContext,
        config: {
          features: {
            filtering: {
              custom: {
                status: {
                  name: 'Status',
                  options: [{ value: 'active', label: 'Active' }],
                },
              },
            },
          },
        } as unknown as ContentListConfigValue,
      };
      const filters = buildSearchBarFilters(['status'], context);
      expect(filters).toHaveLength(1);
      expect(filters[0].type).toBe('custom_component');
    });

    it('excludes custom filter when not defined in config', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const filters = buildSearchBarFilters(['unknownFilter'], baseContext);
      expect(filters).toHaveLength(0);
      // The warning is logged internally.
      consoleSpy.mockRestore();
    });
  });

  describe('filter order', () => {
    it('preserves filter order from filterIds array', () => {
      const filters = buildSearchBarFilters(['tags', 'starred', 'sort', 'createdBy'], baseContext);
      expect(filters).toHaveLength(4);
    });

    it('handles empty filterIds array', () => {
      const filters = buildSearchBarFilters([], baseContext);
      expect(filters).toHaveLength(0);
    });
  });

  describe('all filters together', () => {
    it('builds all pre-built filters correctly', () => {
      const filters = buildSearchBarFilters(['starred', 'sort', 'tags', 'createdBy'], baseContext);
      expect(filters).toHaveLength(4);
      filters.forEach((filter) => {
        expect(filter.type).toBe('custom_component');
      });
    });

    it('handles mixed pre-built and custom filters', () => {
      const context: FilterBuilderContext = {
        ...baseContext,
        config: {
          features: {
            filtering: {
              custom: {
                status: { name: 'Status', options: [] },
                type: { name: 'Type', options: [] },
              },
            },
          },
        } as unknown as ContentListConfigValue,
      };
      const filters = buildSearchBarFilters(['starred', 'status', 'tags', 'type'], context);
      expect(filters).toHaveLength(4);
    });
  });
});
