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
import {
  ContentListProvider,
  contentListQueryClient,
  type FindItemsResult,
  type FindItemsParams,
} from '@kbn/content-list-provider';
import { ContentListFooter } from './content_list_footer';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: Array.from({ length: 50 }, (_, i) => ({
      id: `item-${i}`,
      title: `Item ${i}`,
    })),
    total: 50,
  })
);

const createWrapper =
  (options?: {
    paginationDisabled?: boolean;
    findItems?: (params: FindItemsParams) => Promise<FindItemsResult>;
    initialSearch?: string;
  }) =>
  ({ children }: { children: React.ReactNode }) => {
    const { paginationDisabled, findItems = mockFindItems, initialSearch } = options ?? {};

    return (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
        dataSource={{ findItems }}
        features={{
          ...(paginationDisabled ? { pagination: false as const } : {}),
          ...(initialSearch ? { search: { initialSearch } } : {}),
        }}
      >
        {children}
      </ContentListProvider>
    );
  };

describe('ContentListFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await contentListQueryClient.cancelQueries();
    contentListQueryClient.clear();
  });

  it('renders pagination when pagination is enabled', async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <ContentListFooter />
      </Wrapper>
    );

    // Pagination data loads asynchronously via React Query.
    await waitFor(() => {
      expect(screen.getByTestId('contentListFooter')).toBeInTheDocument();
      expect(screen.getByTestId('contentListFooter-pagination')).toBeInTheDocument();
    });
  });

  it('returns null when pagination is disabled', () => {
    const Wrapper = createWrapper({ paginationDisabled: true });
    const { container } = render(
      <Wrapper>
        <ContentListFooter />
      </Wrapper>
    );

    expect(container.querySelector('[data-test-subj="contentListFooter"]')).toBeNull();
  });

  it('renders a skeleton during initial load', () => {
    const findItems = jest.fn(() => new Promise<FindItemsResult>(() => undefined));
    const Wrapper = createWrapper({ findItems });

    render(
      <Wrapper>
        <ContentListFooter />
      </Wrapper>
    );

    expect(screen.getByTestId('contentListFooter')).toBeInTheDocument();
    expect(screen.getByTestId('contentListFooter-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('contentListFooter-pagination')).not.toBeInTheDocument();
  });

  it('returns null when a query has no matching results', async () => {
    const findItems = jest.fn(async (): Promise<FindItemsResult> => ({ items: [], total: 0 }));
    const Wrapper = createWrapper({ findItems, initialSearch: 'no match' });
    const { container } = render(
      <Wrapper>
        <ContentListFooter />
      </Wrapper>
    );

    await waitFor(() => {
      expect(findItems).toHaveBeenCalled();
      expect(container.querySelector('[data-test-subj="contentListFooter"]')).toBeNull();
    });
  });

  it('applies a custom data-test-subj', async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <ContentListFooter data-test-subj="my-footer" />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('my-footer')).toBeInTheDocument();
    });
  });
});
