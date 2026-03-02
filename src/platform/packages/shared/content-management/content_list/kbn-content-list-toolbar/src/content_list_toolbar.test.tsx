/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ContentListProvider,
  type FindItemsResult,
  type FindItemsParams,
} from '@kbn/content-list-provider';
import type { ContentManagementTagsServices } from '@kbn/content-management-tags';
import { ContentListToolbar } from './content_list_toolbar';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const mockTags = [
  { id: 'tag-1', name: 'Production', description: '', color: '#FF0000', managed: false },
  { id: 'tag-2', name: 'Development', description: '', color: '#00FF00', managed: false },
];

const mockParseSearchQuery = jest.fn((queryText: string) => {
  // Simple mock: extract `tag:Name` patterns and return the rest as `searchQuery`.
  const tagPattern = /tag:(\S+)/g;
  const tagNames: string[] = [];
  let match = tagPattern.exec(queryText);
  while (match) {
    tagNames.push(match[1]);
    match = tagPattern.exec(queryText);
  }
  const searchQuery = queryText.replace(/tag:\S+\s*/g, '').trim();
  return {
    searchQuery,
    tagIds: tagNames.length > 0 ? tagNames : undefined,
    tagIdsToExclude: undefined,
  };
});

const mockTagsService: ContentManagementTagsServices = {
  getTagList: () => mockTags,
  parseSearchQuery: mockParseSearchQuery,
};

interface CreateWrapperOptions {
  sortingDisabled?: boolean;
  searchDisabled?: boolean;
  searchPlaceholder?: string;
  sortFields?: Array<{ field: string; name: string }>;
  tagsService?: ContentManagementTagsServices;
}

const createWrapper =
  (options: CreateWrapperOptions = {}) =>
  ({ children }: { children: React.ReactNode }) => {
    const { sortingDisabled, searchDisabled, searchPlaceholder, sortFields, tagsService } = options;

    const features = {
      sorting: sortingDisabled ? (false as const) : sortFields ? { fields: sortFields } : true,
      search: searchDisabled ? (false as const) : true,
    };

    return (
      <ContentListProvider
        id="test-list"
        labels={{
          entity: 'dashboard',
          entityPlural: 'dashboards',
          searchPlaceholder,
        }}
        dataSource={{ findItems: mockFindItems }}
        features={features}
        services={tagsService ? { tags: tagsService } : undefined}
      >
        {children}
      </ContentListProvider>
    );
  };

describe('ContentListToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders a search bar', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListToolbar />
        </Wrapper>
      );

      expect(screen.getByTestId('contentListToolbar-searchBox')).toBeInTheDocument();
    });

    it('applies custom data-test-subj prefix to the search box', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListToolbar data-test-subj="my-toolbar" />
        </Wrapper>
      );

      expect(screen.getByTestId('my-toolbar-searchBox')).toBeInTheDocument();
    });
  });

  describe('search box', () => {
    it('uses the default placeholder when none is configured', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListToolbar />
        </Wrapper>
      );

      const searchBox = screen.getByTestId('contentListToolbar-searchBox');
      expect(searchBox).toHaveAttribute('placeholder', 'Search\u2026');
    });

    it('renders the search box as enabled by default', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListToolbar />
        </Wrapper>
      );

      const searchBox = screen.getByTestId('contentListToolbar-searchBox');
      expect(searchBox).not.toBeDisabled();
    });

    it('renders the search box as disabled when search is disabled', () => {
      const Wrapper = createWrapper({ searchDisabled: true });
      render(
        <Wrapper>
          <ContentListToolbar />
        </Wrapper>
      );

      const searchBox = screen.getByTestId('contentListToolbar-searchBox');
      expect(searchBox).toBeDisabled();
    });

    it('calls findItems with search text when user types', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListToolbar />
        </Wrapper>
      );

      const searchBox = screen.getByTestId('contentListToolbar-searchBox');
      await userEvent.type(searchBox, 'dashboard');

      // Wait for the incremental search to trigger a refetch with the typed text.
      await waitFor(() => {
        const lastCall = mockFindItems.mock.calls[mockFindItems.mock.calls.length - 1];
        expect(lastCall[0].searchQuery).toContain('dashboard');
      });
    });

    it('reflects the search state in the input value', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListToolbar />
        </Wrapper>
      );

      const searchBox = screen.getByTestId('contentListToolbar-searchBox');
      expect(searchBox).toHaveValue('');

      await userEvent.type(searchBox, 'test query');

      await waitFor(() => {
        expect(searchBox).toHaveValue('test query');
      });
    });

    it('uses the configured search placeholder', () => {
      const Wrapper = createWrapper({ searchPlaceholder: 'Search dashboards...' });
      render(
        <Wrapper>
          <ContentListToolbar />
        </Wrapper>
      );

      const searchBox = screen.getByTestId('contentListToolbar-searchBox');
      expect(searchBox).toHaveAttribute('placeholder', 'Search dashboards...');
    });
  });

  describe('sort filter', () => {
    it('renders the sort filter when sorting is enabled', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListToolbar />
        </Wrapper>
      );

      expect(screen.getByTestId('contentListSortRenderer')).toBeInTheDocument();
    });

    it('does not render the sort filter when sorting is disabled', () => {
      const Wrapper = createWrapper({ sortingDisabled: true });
      render(
        <Wrapper>
          <ContentListToolbar />
        </Wrapper>
      );

      expect(screen.queryByTestId('contentListSortRenderer')).not.toBeInTheDocument();
    });
  });

  describe('declarative filter children', () => {
    it('renders sort filter from declarative children', () => {
      const { Filters } = ContentListToolbar;
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ContentListToolbar>
            <Filters>
              <Filters.Sort />
            </Filters>
          </ContentListToolbar>
        </Wrapper>
      );

      expect(screen.getByTestId('contentListSortRenderer')).toBeInTheDocument();
    });

    it('falls back to default filter order when Filters has no valid children', () => {
      const { Filters } = ContentListToolbar;
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ContentListToolbar>
            <Filters>
              <div>Not a filter</div>
            </Filters>
          </ContentListToolbar>
        </Wrapper>
      );

      // Should still render the sort filter from defaults.
      expect(screen.getByTestId('contentListSortRenderer')).toBeInTheDocument();
    });

    it('falls back to default filter order when no Filters child provided', () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ContentListToolbar>
            <div>Not a Filters component</div>
          </ContentListToolbar>
        </Wrapper>
      );

      expect(screen.getByTestId('contentListSortRenderer')).toBeInTheDocument();
    });

    it('ignores non-element children (null, strings)', () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ContentListToolbar>
            {null}
            {'just a string'}
          </ContentListToolbar>
        </Wrapper>
      );

      // Should fall back to default filters.
      expect(screen.getByTestId('contentListSortRenderer')).toBeInTheDocument();
    });

    it('resolves Filters wrapped in a Fragment', () => {
      const { Filters } = ContentListToolbar;
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ContentListToolbar>
            <>
              <Filters>
                <Filters.Sort />
              </Filters>
            </>
          </ContentListToolbar>
        </Wrapper>
      );

      expect(screen.getByTestId('contentListSortRenderer')).toBeInTheDocument();
    });
  });

  describe('tag filter integration with parseSearchQuery', () => {
    it('calls parseSearchQuery and passes parsed tags to findItems', async () => {
      const Wrapper = createWrapper({ tagsService: mockTagsService });
      render(
        <Wrapper>
          <ContentListToolbar />
        </Wrapper>
      );

      const searchBox = screen.getByTestId('contentListToolbar-searchBox');
      await userEvent.type(searchBox, 'tag:Production my query');

      await waitFor(() => {
        expect(mockParseSearchQuery).toHaveBeenCalledWith('tag:Production my query');
      });

      // Verify that `findItems` receives the parsed search query and tag filters.
      await waitFor(() => {
        const lastCall = mockFindItems.mock.calls[mockFindItems.mock.calls.length - 1];
        expect(lastCall[0].searchQuery).toBe('my query');
        expect(lastCall[0].filters.tag).toEqual({
          include: ['Production'],
          exclude: [],
        });
      });
    });

    it('passes search text without tags when no tag syntax is used', async () => {
      const Wrapper = createWrapper({ tagsService: mockTagsService });
      render(
        <Wrapper>
          <ContentListToolbar />
        </Wrapper>
      );

      const searchBox = screen.getByTestId('contentListToolbar-searchBox');
      await userEvent.type(searchBox, 'plain search');

      await waitFor(() => {
        const lastCall = mockFindItems.mock.calls[mockFindItems.mock.calls.length - 1];
        expect(lastCall[0].searchQuery).toBe('plain search');
        expect(lastCall[0].filters.tag).toBeUndefined();
      });
    });

    it('falls back to simple search when no tags service is provided', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListToolbar />
        </Wrapper>
      );

      const searchBox = screen.getByTestId('contentListToolbar-searchBox');
      await userEvent.type(searchBox, 'tag:Production my query');

      // Without tags service, the entire text is treated as the search query.
      await waitFor(() => {
        const lastCall = mockFindItems.mock.calls[mockFindItems.mock.calls.length - 1];
        expect(lastCall[0].searchQuery).toContain('tag:Production my query');
        expect(lastCall[0].filters.tag).toBeUndefined();
      });
    });
  });
});
