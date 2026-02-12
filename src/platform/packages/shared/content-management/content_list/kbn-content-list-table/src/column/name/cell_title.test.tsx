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
  type ContentListItem,
} from '@kbn/content-list-provider';
import { NameCellTitle } from './cell_title';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const createWrapper =
  (options?: { getHref?: (item: ContentListItem) => string }) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'item', entityPlural: 'items' }}
        dataSource={{ findItems: mockFindItems }}
        item={options?.getHref ? { getHref: options.getHref } : undefined}
      >
        {children}
      </ContentListProvider>
    );

const createItem = (overrides?: Partial<ContentListItem>): ContentListItem => ({
  id: '1',
  title: 'Test Item',
  ...overrides,
});

describe('NameCellTitle', () => {
  it('renders as a link when `getHref` is configured', () => {
    const Wrapper = createWrapper({ getHref: (item) => `/view/${item.id}` });
    render(
      <Wrapper>
        <NameCellTitle item={createItem({ title: 'Linked Item' })} />
      </Wrapper>
    );

    const link = screen.getByTestId('content-list-table-item-link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/view/1');
    expect(link).toHaveTextContent('Linked Item');
  });

  it('renders as plain text when `getHref` is not configured', () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <NameCellTitle item={createItem({ title: 'Plain Item' })} />
      </Wrapper>
    );

    expect(screen.getByText('Plain Item')).toBeInTheDocument();
    expect(screen.queryByTestId('content-list-table-item-link')).not.toBeInTheDocument();
  });

  it('renders as plain text when `getHref` returns an empty string', () => {
    const Wrapper = createWrapper({ getHref: () => '' });
    render(
      <Wrapper>
        <NameCellTitle item={createItem({ title: 'No Link Item' })} />
      </Wrapper>
    );

    expect(screen.getByText('No Link Item')).toBeInTheDocument();
    expect(screen.queryByTestId('content-list-table-item-link')).not.toBeInTheDocument();
  });
});
