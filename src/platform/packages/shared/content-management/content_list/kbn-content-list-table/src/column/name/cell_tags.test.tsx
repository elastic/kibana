/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import {
  ContentListProvider,
  useContentListFilters,
  type FindItemsResult,
  type FindItemsParams,
} from '@kbn/content-list-provider';
import type { ContentManagementTagsServices } from '@kbn/content-management-tags';
import { NameCellTags } from './cell_tags';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const mockTags = [
  { id: 'tag-1', name: 'Production', description: '', color: '#FF0000', managed: false },
  { id: 'tag-2', name: 'Development', description: '', color: '#00FF00', managed: false },
  { id: 'tag-3', name: 'Staging', description: '', color: '#0000FF', managed: false },
];

const mockTagsService: ContentManagementTagsServices = {
  getTagList: () => mockTags,
};

const FilterState = () => {
  const { filters } = useContentListFilters();
  return <pre data-test-subj="filter-state">{JSON.stringify(filters)}</pre>;
};

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiProvider>
    <ContentListProvider
      id="test-list"
      labels={{ entity: 'item', entityPlural: 'items' }}
      dataSource={{ findItems: mockFindItems }}
      services={{ tags: mockTagsService }}
    >
      <FilterState />
      {children}
    </ContentListProvider>
  </EuiProvider>
);

describe('NameCellTags', () => {
  it('renders nothing when `tagIds` is empty', () => {
    const { container } = render(
      <Wrapper>
        <NameCellTags tagIds={[]} />
      </Wrapper>
    );

    expect(container.querySelector('[data-test-subj^="tag-"]')).not.toBeInTheDocument();
  });

  it('renders tag badges for given IDs', () => {
    render(
      <Wrapper>
        <NameCellTags tagIds={['tag-1', 'tag-2']} />
      </Wrapper>
    );

    expect(screen.getByTestId('tag-tag-1')).toBeInTheDocument();
    expect(screen.getByTestId('tag-tag-2')).toBeInTheDocument();
    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(screen.getByText('Development')).toBeInTheDocument();
  });

  it('adds an include filter on regular click', () => {
    render(
      <Wrapper>
        <NameCellTags tagIds={['tag-1']} />
      </Wrapper>
    );

    fireEvent.click(screen.getByText('Production'));

    const state = JSON.parse(screen.getByTestId('filter-state').textContent!);
    expect(state.tag?.include).toContain('tag-1');
  });

  it('toggles off an include filter on second click', () => {
    render(
      <Wrapper>
        <NameCellTags tagIds={['tag-1']} />
      </Wrapper>
    );

    fireEvent.click(screen.getByText('Production'));
    fireEvent.click(screen.getByText('Production'));

    const state = JSON.parse(screen.getByTestId('filter-state').textContent!);
    expect(state.tag?.include ?? []).not.toContain('tag-1');
  });

  it('adds an exclude filter on modifier+click', () => {
    render(
      <Wrapper>
        <NameCellTags tagIds={['tag-1']} />
      </Wrapper>
    );

    fireEvent.click(screen.getByText('Production'), { ctrlKey: true });

    const state = JSON.parse(screen.getByTestId('filter-state').textContent!);
    expect(state.tag?.exclude).toContain('tag-1');
  });

  it('toggles off an exclude filter on second modifier+click', () => {
    render(
      <Wrapper>
        <NameCellTags tagIds={['tag-1']} />
      </Wrapper>
    );

    fireEvent.click(screen.getByText('Production'), { ctrlKey: true });
    fireEvent.click(screen.getByText('Production'), { ctrlKey: true });

    const state = JSON.parse(screen.getByTestId('filter-state').textContent!);
    expect(state.tag?.exclude ?? []).not.toContain('tag-1');
  });

  it('calls custom `onTagClick` when provided', () => {
    const handleClick = jest.fn();

    render(
      <Wrapper>
        <NameCellTags tagIds={['tag-1']} onTagClick={handleClick} />
      </Wrapper>
    );

    fireEvent.click(screen.getByText('Production'));

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tag-1', name: 'Production' }),
      expect.any(Boolean)
    );

    const state = JSON.parse(screen.getByTestId('filter-state').textContent!);
    expect(state.tag).toBeUndefined();
  });
});
