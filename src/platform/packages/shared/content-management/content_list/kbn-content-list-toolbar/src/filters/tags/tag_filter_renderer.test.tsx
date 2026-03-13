/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Query } from '@elastic/eui';
import {
  ContentListProvider,
  contentListQueryClient,
  type FindItemsResult,
  type FindItemsParams,
  type FilterFeatureConfig,
  type ContentListServices,
} from '@kbn/content-list-provider';
import { TagFilterRenderer } from './tag_filter_renderer';

const mockTags = [
  {
    id: 'tag-1',
    name: 'Production',
    description: 'Production items',
    color: '#FF0000',
    managed: false,
  },
  { id: 'tag-2', name: 'Development', description: 'Dev items', color: '#00FF00', managed: false },
  {
    id: 'tag-3',
    name: 'Archived',
    description: 'Archived items',
    color: '#808080',
    managed: false,
  },
];

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [
      { id: 'item-1', title: 'Item 1', tags: ['tag-1', 'tag-2'] },
      { id: 'item-2', title: 'Item 2', tags: ['tag-1'] },
      { id: 'item-3', title: 'Item 3', tags: ['tag-3'] },
    ],
    total: 3,
  })
);

/**
 * Build a `FilterFeatureConfig` for tags that returns tag facets (optionally with counts).
 */
const createTagsFilterConfig = (counts?: Record<string, number>): FilterFeatureConfig => ({
  getMetadata: async () =>
    mockTags.map((tag) => ({
      key: tag.id,
      label: tag.name,
      count: counts?.[tag.id],
      data: tag,
    })),
});

const createWrapper = (options?: {
  tagsFeatureConfig?: FilterFeatureConfig;
  services?: ContentListServices;
}) => {
  const { tagsFeatureConfig, services } = options ?? {};
  return ({ children }: { children: React.ReactNode }) => (
    <ContentListProvider
      id="test-list"
      labels={{ entity: 'item', entityPlural: 'items' }}
      dataSource={{ findItems: mockFindItems }}
      features={tagsFeatureConfig ? { tags: tagsFeatureConfig } : {}}
      services={services}
    >
      {children}
    </ContentListProvider>
  );
};

describe('TagFilterRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contentListQueryClient.clear();
  });

  it('renders the tag filter button', () => {
    render(<TagFilterRenderer query={Query.parse('')} />, {
      wrapper: createWrapper({ tagsFeatureConfig: createTagsFilterConfig() }),
    });

    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('renders nothing when no tags feature config is provided', () => {
    const { container } = render(<TagFilterRenderer query={Query.parse('')} />, {
      wrapper: createWrapper(),
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('shows tag options when popover is opened', async () => {
    render(<TagFilterRenderer query={Query.parse('')} />, {
      wrapper: createWrapper({ tagsFeatureConfig: createTagsFilterConfig() }),
    });

    fireEvent.click(screen.getByText('Tags'));

    await waitFor(() => {
      expect(screen.getByText('Production')).toBeInTheDocument();
      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.getByText('Archived')).toBeInTheDocument();
    });
  });

  it('shows modifier hint text in the footer', async () => {
    render(<TagFilterRenderer query={Query.parse('')} />, {
      wrapper: createWrapper({ tagsFeatureConfig: createTagsFilterConfig() }),
    });

    fireEvent.click(screen.getByText('Tags'));

    expect(screen.getByText(/\+ click exclude/)).toBeInTheDocument();
  });

  it('calls `onChange` when a tag option is clicked', async () => {
    const onChange = jest.fn();

    render(<TagFilterRenderer query={Query.parse('')} onChange={onChange} />, {
      wrapper: createWrapper({ tagsFeatureConfig: createTagsFilterConfig() }),
    });

    fireEvent.click(screen.getByText('Tags'));

    await waitFor(() => screen.getByText('Production'));
    fireEvent.click(screen.getByText('Production'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const updatedQuery: Query = onChange.mock.calls[0][0];
    expect(updatedQuery.text).toContain('Production');
  });

  it('reflects include state from query prop', async () => {
    const query = Query.parse('').addOrFieldValue('tag', 'Production', true, 'eq');

    render(<TagFilterRenderer query={query} />, {
      wrapper: createWrapper({ tagsFeatureConfig: createTagsFilterConfig() }),
    });

    fireEvent.click(screen.getByText('Tags'));

    await waitFor(() => {
      const productionOption = screen.getByTestId('tag-searchbar-option-tag-1');
      expect(productionOption).toBeInTheDocument();
    });
  });

  it('renders tag options with health indicator colors', async () => {
    render(<TagFilterRenderer query={Query.parse('')} />, {
      wrapper: createWrapper({ tagsFeatureConfig: createTagsFilterConfig() }),
    });

    fireEvent.click(screen.getByText('Tags'));

    await waitFor(() => {
      expect(screen.getByTestId('tag-searchbar-option-tag-1')).toBeInTheDocument();
      expect(screen.getByTestId('tag-searchbar-option-tag-2')).toBeInTheDocument();
      expect(screen.getByTestId('tag-searchbar-option-tag-3')).toBeInTheDocument();
    });
  });

  it('removes a tag from the query when clicking an already-included tag', async () => {
    const query = Query.parse('').addOrFieldValue('tag', 'Production', true, 'eq');
    const onChange = jest.fn();

    render(<TagFilterRenderer query={query} onChange={onChange} />, {
      wrapper: createWrapper({ tagsFeatureConfig: createTagsFilterConfig() }),
    });

    fireEvent.click(screen.getByText('Tags'));
    await waitFor(() => screen.getByText('Production'));
    fireEvent.click(screen.getByText('Production'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const updatedQuery: Query = onChange.mock.calls[0][0];
    expect(updatedQuery.text).not.toContain('Production');
  });

  describe('tag counts from getMetadata', () => {
    it('displays counts provided by FilterFeatureConfig.getMetadata', async () => {
      const counts = { 'tag-1': 2, 'tag-2': 1 };

      render(<TagFilterRenderer query={Query.parse('')} />, {
        wrapper: createWrapper({ tagsFeatureConfig: createTagsFilterConfig(counts) }),
      });

      fireEvent.click(screen.getByText('Tags'));

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });

    it('shows no count badge when count is omitted from a facet', async () => {
      // Only tag-1 has a count; tag-2 and tag-3 have none.
      const counts = { 'tag-1': 5 };

      render(<TagFilterRenderer query={Query.parse('')} />, {
        wrapper: createWrapper({ tagsFeatureConfig: createTagsFilterConfig(counts) }),
      });

      fireEvent.click(screen.getByText('Tags'));

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });

      // tag-2 and tag-3 names appear but without a count badge.
      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('plain ContentListProvider with services.tags (no explicit FilterFeatureConfig)', () => {
    const mockTagsService = {
      getTagList: () => mockTags,
    };

    it('renders the tag filter button when only services.tags is provided', () => {
      render(<TagFilterRenderer query={Query.parse('')} />, {
        wrapper: createWrapper({ services: { tags: mockTagsService } }),
      });

      expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    it('shows tag options when popover is opened with services.tags only', async () => {
      render(<TagFilterRenderer query={Query.parse('')} />, {
        wrapper: createWrapper({ services: { tags: mockTagsService } }),
      });

      fireEvent.click(screen.getByText('Tags'));

      await waitFor(() => {
        expect(screen.getByText('Production')).toBeInTheDocument();
        expect(screen.getByText('Development')).toBeInTheDocument();
        expect(screen.getByText('Archived')).toBeInTheDocument();
      });
    });

    it('calls onChange when a tag is selected with services.tags only', async () => {
      const onChange = jest.fn();

      render(<TagFilterRenderer query={Query.parse('')} onChange={onChange} />, {
        wrapper: createWrapper({ services: { tags: mockTagsService } }),
      });

      fireEvent.click(screen.getByText('Tags'));
      await waitFor(() => screen.getByText('Production'));
      fireEvent.click(screen.getByText('Production'));

      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });
});
