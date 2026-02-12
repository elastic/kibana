/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  ContentListProvider,
  type FindItemsResult,
  type FindItemsParams,
} from '@kbn/content-list-provider';
import { ContentListToolbar } from './content_list_toolbar';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const createWrapper =
  (options?: {
    sortingDisabled?: boolean;
    searchPlaceholder?: string;
    sortFields?: Array<{ field: string; name: string }>;
  }) =>
  ({ children }: { children: React.ReactNode }) => {
    const { sortingDisabled, searchPlaceholder, sortFields } = options ?? {};

    const sorting = sortingDisabled
      ? (false as const)
      : sortFields
      ? { fields: sortFields }
      : undefined;

    return (
      <ContentListProvider
        id="test-list"
        labels={{
          entity: 'dashboard',
          entityPlural: 'dashboards',
          searchPlaceholder,
        }}
        dataSource={{ findItems: mockFindItems }}
        features={sorting !== undefined ? { sorting } : undefined}
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

    it('renders the search box as disabled', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListToolbar />
        </Wrapper>
      );

      const searchBox = screen.getByTestId('contentListToolbar-searchBox');
      expect(searchBox).toBeDisabled();
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
});
