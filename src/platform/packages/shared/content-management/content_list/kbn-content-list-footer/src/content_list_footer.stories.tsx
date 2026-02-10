/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ContentListProvider } from '@kbn/content-list-provider';
import type { FindItemsParams, FindItemsResult } from '@kbn/content-list-provider';
import { createMockFindItems, MOCK_DASHBOARDS } from '@kbn/content-list-mock-data/storybook';
import { ContentListFooter } from './content_list_footer';

// =============================================================================
// Mock Data & Helpers
// =============================================================================

/**
 * Build a mock items array of the requested length by cycling through
 * `MOCK_DASHBOARDS` and appending an index suffix when needed.
 */
const buildMockItems = (count: number): typeof MOCK_DASHBOARDS => {
  const base = MOCK_DASHBOARDS;
  if (count <= base.length) {
    return base.slice(0, count);
  }

  return Array.from({ length: count }, (_, i) => {
    const source = base[i % base.length];
    return i < base.length
      ? source
      : {
          ...source,
          id: `${source.id}-${i}`,
          attributes: {
            ...source.attributes,
            title: `${source.attributes.title} (${i + 1})`,
          },
        };
  });
};

/**
 * Creates a mock `findItems` function with configurable total item count.
 */
const createStoryFindItems = (options?: { totalItems?: number }) => {
  const { totalItems = MOCK_DASHBOARDS.length } = options ?? {};

  const items = buildMockItems(totalItems);
  const mockFindItems = createMockFindItems({ items });

  return async (params: FindItemsParams): Promise<FindItemsResult> => {
    const result = await mockFindItems({
      searchQuery: params.searchQuery,
      filters: {},
      sort: params.sort ?? { field: 'title', direction: 'asc' },
      page: params.page,
    });

    return {
      items: result.items.map((item) => ({
        id: item.id,
        title: item.attributes.title,
        description: item.attributes.description,
        type: item.type,
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
      })),
      total: result.total,
    };
  };
};

// =============================================================================
// Storybook Meta
// =============================================================================

interface StoryArgs {
  totalItems: number;
  hasPagination: boolean;
  initialPageSize: number;
}

const meta: Meta<StoryArgs> = {
  title: 'Content Management/Content List/Footer',
  parameters: { layout: 'padded' },
  argTypes: {
    totalItems: {
      control: { type: 'number', min: 0, max: 200, step: 10 },
      description: 'Total number of items in the data source.',
      table: { category: 'Data' },
    },
    hasPagination: {
      control: 'boolean',
      description: 'Enable pagination controls.',
      table: { category: 'Features' },
    },
    initialPageSize: {
      control: { type: 'select' },
      options: [10, 20, 50, 100],
      description: 'Initial items per page.',
      table: { category: 'Pagination' },
    },
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

// =============================================================================
// Story Wrapper
// =============================================================================

/**
 * Story wrapper component that handles stable prop references via `useMemo`.
 */
const FooterStory = ({ args }: { args: StoryArgs }) => {
  const labels = useMemo(() => ({ entity: 'dashboard', entityPlural: 'dashboards' }), []);

  const dataSource = useMemo(() => {
    const findItems = createStoryFindItems({ totalItems: args.totalItems });
    return { findItems };
  }, [args.totalItems]);

  const features = useMemo(
    () => ({
      pagination: args.hasPagination ? { initialPageSize: args.initialPageSize } : (false as const),
    }),
    [args.hasPagination, args.initialPageSize]
  );

  // Key forces re-mount when configuration changes.
  const key = `${args.totalItems}-${args.hasPagination}-${args.initialPageSize}`;

  return (
    <ContentListProvider key={key} id="footer-playground" {...{ labels, dataSource, features }}>
      <ContentListFooter />
    </ContentListProvider>
  );
};

// =============================================================================
// Story
// =============================================================================

/**
 * Interactive playground to explore footer pagination.
 * Use the controls panel to toggle features and observe behavior.
 */
export const Footer: Story = {
  args: {
    totalItems: 50,
    hasPagination: true,
    initialPageSize: 20,
  },
  render: (args) => <FooterStory args={args} />,
};
