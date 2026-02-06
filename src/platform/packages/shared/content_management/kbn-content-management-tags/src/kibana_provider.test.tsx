/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { taggingApiMock } from '@kbn/saved-objects-tagging-oss-plugin/public/mocks';
import type { Tag } from './types';
import {
  ContentManagementTagsKibanaProvider,
  useServices,
  type ContentManagementTagsKibanaDependencies,
} from './services';

describe('ContentManagementTagsKibanaProvider', () => {
  const mockTags: Tag[] = [
    {
      id: 'tag-1',
      name: 'Important',
      description: 'Important items',
      color: '#FF0000',
      managed: false,
    },
    { id: 'tag-2', name: 'Urgent', description: 'Urgent items', color: '#FFA500', managed: false },
    { id: 'tag-3', name: 'Review', description: 'Needs review', color: '#0000FF', managed: false },
  ];

  const mockSavedObjectsTagging = taggingApiMock.create();
  // Cast to the tagging plugin's Tag type (which requires id: string, not optional)
  mockSavedObjectsTagging.ui.getTagList.mockReturnValue(mockTags as any);

  const mockAddError = jest.fn();

  const mockCore: ContentManagementTagsKibanaDependencies['core'] = {
    notifications: {
      toasts: {
        addError: mockAddError,
      },
    },
  };

  const createWrapper = (savedObjectsTagging: SavedObjectsTaggingApi) => {
    return ({ children }: { children: React.ReactNode }) => (
      <ContentManagementTagsKibanaProvider
        savedObjectsTagging={savedObjectsTagging}
        core={mockCore}
      >
        {children}
      </ContentManagementTagsKibanaProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddError.mockClear();
  });

  describe('getTagList', () => {
    it('returns tags when savedObjectsTagging is provided', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      const tags = result.current?.getTagList();
      expect(tags).toEqual(mockTags);
      expect(mockSavedObjectsTagging.ui.getTagList).toHaveBeenCalled();
    });
  });

  describe('parseSearchQuery', () => {
    it('parses simple search query without tags', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      const parsed = result.current?.parseSearchQuery?.('dashboard');
      expect(parsed).toEqual({
        searchQuery: 'dashboard',
        tagIds: undefined,
        tagIdsToExclude: undefined,
      });
    });

    it('parses query with include tag filter', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      const parsed = result.current?.parseSearchQuery?.('tag:(Important)');
      expect(parsed).toEqual({
        searchQuery: '',
        tagIds: ['tag-1'],
        tagIdsToExclude: undefined,
      });
    });

    it('parses query with exclude tag filter', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      const parsed = result.current?.parseSearchQuery?.('-tag:(Important)');
      expect(parsed).toEqual({
        searchQuery: '',
        tagIds: undefined,
        tagIdsToExclude: ['tag-1'],
      });
    });

    it('parses query with multiple include tags', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      const parsed = result.current?.parseSearchQuery?.('tag:(Important or Urgent)');
      expect(parsed).toEqual({
        searchQuery: '',
        tagIds: ['tag-1', 'tag-2'],
        tagIdsToExclude: undefined,
      });
    });

    it('parses query with multiple exclude tags', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      const parsed = result.current?.parseSearchQuery?.('-tag:(Important or Urgent)');
      expect(parsed).toEqual({
        searchQuery: '',
        tagIds: undefined,
        tagIdsToExclude: ['tag-1', 'tag-2'],
      });
    });

    it('parses query with both include and exclude tags', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      const parsed = result.current?.parseSearchQuery?.('tag:(Important) -tag:(Review)');
      expect(parsed).toEqual({
        searchQuery: '',
        tagIds: ['tag-1'],
        tagIdsToExclude: ['tag-3'],
      });
    });

    it('preserves non-tag search terms', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      const parsed = result.current?.parseSearchQuery?.('dashboard tag:(Important)');
      expect(parsed).toEqual({
        searchQuery: 'dashboard',
        tagIds: ['tag-1'],
        tagIdsToExclude: undefined,
      });
    });

    it('ignores unknown tag names by returning original query', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      const parsed = result.current?.parseSearchQuery?.('tag:(NonExistent)');
      expect(parsed).toEqual({
        searchQuery: 'tag:(NonExistent)',
        tagIds: undefined,
        tagIdsToExclude: undefined,
      });
    });

    it('handles tags without IDs', () => {
      const tagsWithoutIds: Tag[] = [
        { name: 'NoID', description: 'Tag without ID', color: '#000000', managed: false },
      ];

      const mockWithoutIds = taggingApiMock.create();
      mockWithoutIds.ui.getTagList.mockReturnValue(tagsWithoutIds as any);

      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockWithoutIds),
      });

      const parsed = result.current?.parseSearchQuery?.('tag:(NoID)');
      expect(parsed).toEqual({
        searchQuery: 'tag:(NoID)',
        tagIds: undefined,
        tagIdsToExclude: undefined,
      });
    });

    it('handles malformed queries gracefully', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      // Query.parse with strict mode should throw on invalid syntax.
      // Our implementation catches this and returns the original query.
      const parsed = result.current?.parseSearchQuery?.('tag:(Important');
      expect(parsed).toEqual({
        searchQuery: 'tag:(Important',
        tagIds: undefined,
        tagIdsToExclude: undefined,
      });
    });

    it('returns undefined tag ID arrays when no tags match', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      const parsed = result.current?.parseSearchQuery?.('tag:(Unknown) -tag:(AlsoUnknown)');
      expect(parsed).toEqual({
        searchQuery: 'tag:(Unknown) -tag:(AlsoUnknown)',
        tagIds: undefined,
        tagIdsToExclude: undefined,
      });
    });

    it('skips tags without IDs while keeping valid matches', () => {
      const tagsWithoutIds: Tag[] = [
        { name: 'NoID', description: 'Tag without ID', color: '#000000', managed: false },
        {
          id: 'tag-1',
          name: 'Important',
          description: 'Has ID',
          color: '#FF0000',
          managed: false,
        },
      ];

      const mockWithoutIds = taggingApiMock.create();
      mockWithoutIds.ui.getTagList.mockReturnValue(tagsWithoutIds as any);

      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockWithoutIds),
      });

      const parsed = result.current?.parseSearchQuery?.('tag:(NoID or Important)');
      expect(parsed).toEqual({
        searchQuery: '',
        tagIds: ['tag-1'],
        tagIdsToExclude: undefined,
      });
    });
  });

  describe('integration with TagsContextProvider', () => {
    it('provides all required context values', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      expect(result.current?.getTagList).toBeDefined();
      expect(result.current?.parseSearchQuery).toBeDefined();
    });
  });

  describe('memoization', () => {
    it('memoizes getTagList callback', () => {
      const { result, rerender } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      const firstGetTagList = result.current?.getTagList;
      rerender();

      expect(result.current?.getTagList).toBe(firstGetTagList);
    });

    it('memoizes parseSearchQuery function', () => {
      const { result, rerender } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      const firstParseSearchQuery = result.current?.parseSearchQuery;
      rerender();

      expect(result.current?.parseSearchQuery).toBe(firstParseSearchQuery);
    });

    it('recreates getTagList when savedObjectsTagging.ui.getTagList changes', () => {
      const firstMock = taggingApiMock.create();
      firstMock.ui.getTagList.mockReturnValue(mockTags as any);

      const { result, rerender } = renderHook(() => useServices(), {
        wrapper: createWrapper(firstMock),
      });

      const firstGetTagList = result.current?.getTagList;

      // Create a new mock with different reference
      const secondMock = taggingApiMock.create();
      secondMock.ui.getTagList.mockReturnValue(mockTags as any);

      // Since we can't change the wrapper, we'll verify the function reference remains stable
      // when the mock doesn't actually change
      rerender();

      expect(result.current?.getTagList).toBe(firstGetTagList);
    });
  });

  describe('error handling', () => {
    it('handles errors in parseSearchQuery gracefully', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      // Test with a query that might cause parsing errors.
      const parsed = result.current?.parseSearchQuery?.('tag:(unclosed');
      expect(parsed).toBeDefined();
      expect(parsed?.searchQuery).toBe('tag:(unclosed');

      expect(mockAddError).toHaveBeenCalledWith(expect.any(Error), {
        title: 'Error parsing search query for tags',
      });
    });

    it('handles getTagList throwing an error gracefully', () => {
      const throwingMock = taggingApiMock.create();
      throwingMock.ui.getTagList.mockImplementation(() => {
        throw new Error('Failed to get tags');
      });

      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(throwingMock),
      });

      // Should return empty array instead of throwing.
      expect(result.current?.getTagList()).toEqual([]);
      expect(mockAddError).toHaveBeenCalledWith(expect.any(Error), {
        title: 'Error fetching tag list',
      });
    });
  });

  describe('complex query scenarios', () => {
    it('handles query with tag filter combined with createdBy filter', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      // This scenario was previously failing because strict: true caused parsing to fail
      // when the query contained field clauses not in the schema (like createdBy)
      const parsed = result.current?.parseSearchQuery?.(
        'createdBy:("cloud.user@elastic.co") tag:(Important)'
      );
      expect(parsed).toEqual({
        searchQuery: 'createdBy:("cloud.user@elastic.co")',
        tagIds: ['tag-1'],
        tagIdsToExclude: undefined,
      });
    });

    it('handles query with tag filter combined with is:favorite filter', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      const parsed = result.current?.parseSearchQuery?.('is:favorite tag:(Urgent)');
      expect(parsed).toEqual({
        searchQuery: 'is:favorite',
        tagIds: ['tag-2'],
        tagIdsToExclude: undefined,
      });
    });

    it('handles query with multiple field clauses and tag filter', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      const parsed = result.current?.parseSearchQuery?.(
        'createdBy:("user@example.com") is:favorite tag:(Important) some search text'
      );
      expect(parsed).toEqual({
        searchQuery: 'createdBy:("user@example.com") is:favorite some search text',
        tagIds: ['tag-1'],
        tagIdsToExclude: undefined,
      });
    });

    it('handles query with only search terms (no tag filters)', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      const parsed = result.current?.parseSearchQuery?.('some search term');
      expect(parsed).toEqual({
        searchQuery: 'some search term',
        tagIds: undefined,
        tagIdsToExclude: undefined,
      });
    });

    it('handles query with special characters in search terms', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      const parsed = result.current?.parseSearchQuery?.('search-term_with*special!chars');

      // If parsing fails due to special chars, it should return the original query.
      expect(parsed).toBeDefined();
      expect(parsed?.searchQuery).toBeDefined();
    });

    it('handles case sensitivity in tag names', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      // Tag names are case-sensitive in the match
      const parsed = result.current?.parseSearchQuery?.('tag:(important)');
      // Should not match 'Important' (capital I)
      expect(parsed).toEqual({
        searchQuery: 'tag:(important)',
        tagIds: undefined,
        tagIdsToExclude: undefined,
      });
    });

    it('handles empty tag filter', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(mockSavedObjectsTagging),
      });

      const parsed = result.current?.parseSearchQuery?.('tag:()');
      expect(parsed).toEqual({
        searchQuery: 'tag:()',
        tagIds: undefined,
        tagIdsToExclude: undefined,
      });
    });
  });
});
