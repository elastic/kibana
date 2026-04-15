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
import { EuiProvider } from '@elastic/eui';
import {
  ContentListProvider,
  type FindItemsResult,
  type FindItemsParams,
  type ContentListItem,
} from '@kbn/content-list-provider';
import type { ContentManagementTagsServices } from '@kbn/content-management-tags';
import { NameCell } from './name_cell';

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

const mockTagsService: ContentManagementTagsServices = {
  getTagList: () => mockTags,
};

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ContentListProvider
    id="test-list"
    labels={{ entity: 'item', entityPlural: 'items' }}
    dataSource={{ findItems: mockFindItems }}
  >
    {children}
  </ContentListProvider>
);

const WrapperWithTags = ({ children }: { children: React.ReactNode }) => (
  <EuiProvider>
    <ContentListProvider
      id="test-list"
      labels={{ entity: 'item', entityPlural: 'items' }}
      dataSource={{ findItems: mockFindItems }}
      services={{ tags: mockTagsService }}
    >
      {children}
    </ContentListProvider>
  </EuiProvider>
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

  describe('showTags', () => {
    it('does not render tags by default', () => {
      render(
        <Wrapper>
          <NameCell item={createItem({ tags: ['tag-1', 'tag-2'] })} />
        </Wrapper>
      );

      // Tags should not be rendered when `showTags` is false (default).
      expect(screen.queryByTestId(/^tag-/)).not.toBeInTheDocument();
    });

    it('does not render tags when `showTags` is true but item has no tags', () => {
      render(
        <Wrapper>
          <NameCell item={createItem()} showTags />
        </Wrapper>
      );

      expect(screen.queryByTestId(/^tag-/)).not.toBeInTheDocument();
    });

    it('does not render tags when `showTags` is true but tags array is empty', () => {
      render(
        <Wrapper>
          <NameCell item={createItem({ tags: [] })} showTags />
        </Wrapper>
      );

      expect(screen.queryByTestId(/^tag-/)).not.toBeInTheDocument();
    });

    it('renders tag badges when `showTags` is true and item has tags', () => {
      render(
        <WrapperWithTags>
          <NameCell item={createItem({ tags: ['tag-1', 'tag-2'] })} showTags />
        </WrapperWithTags>
      );

      expect(screen.getByTestId('tag-tag-1')).toBeInTheDocument();
      expect(screen.getByTestId('tag-tag-2')).toBeInTheDocument();
      expect(screen.getByText('Production')).toBeInTheDocument();
      expect(screen.getByText('Development')).toBeInTheDocument();
    });

    it('renders only known tags and skips unknown tag IDs', () => {
      render(
        <WrapperWithTags>
          <NameCell item={createItem({ tags: ['tag-1', 'unknown-tag'] })} showTags />
        </WrapperWithTags>
      );

      expect(screen.getByTestId('tag-tag-1')).toBeInTheDocument();
      expect(screen.getByText('Production')).toBeInTheDocument();
    });
  });
});
