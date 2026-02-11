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
import { NameCell } from './name_cell';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ContentListProvider
    id="test-list"
    labels={{ entity: 'item', entityPlural: 'items' }}
    dataSource={{ findItems: mockFindItems }}
  >
    {children}
  </ContentListProvider>
);

const createItem = (overrides?: Partial<ContentListItem>): ContentListItem => ({
  id: '1',
  title: 'Test Item',
  description: 'A test description',
  ...overrides,
});

describe('NameCell', () => {
  it('renders the item title', () => {
    render(
      <Wrapper>
        <NameCell item={createItem({ title: 'My Dashboard' })} />
      </Wrapper>
    );

    expect(screen.getByText('My Dashboard')).toBeInTheDocument();
  });

  it('renders the description by default', () => {
    render(
      <Wrapper>
        <NameCell item={createItem({ description: 'A helpful description' })} />
      </Wrapper>
    );

    expect(screen.getByText('A helpful description')).toBeInTheDocument();
  });

  it('hides the description when `showDescription` is false', () => {
    render(
      <Wrapper>
        <NameCell
          item={createItem({ description: 'Hidden description' })}
          showDescription={false}
        />
      </Wrapper>
    );

    expect(screen.queryByText('Hidden description')).not.toBeInTheDocument();
  });

  it('does not render description when item has no description', () => {
    const { container } = render(
      <Wrapper>
        <NameCell item={createItem({ description: undefined })} />
      </Wrapper>
    );

    // Only the title should be rendered, no `<p>` for description.
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });
});
