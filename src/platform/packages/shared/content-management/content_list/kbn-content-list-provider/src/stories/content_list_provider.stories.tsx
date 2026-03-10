/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiButton,
  EuiButtonGroup,
  EuiBasicTable,
  EuiIcon,
  EuiCallOut,
} from '@elastic/eui';
import {
  MOCK_DASHBOARDS,
  MOCK_TAGS,
  createMockFindItems,
  extractTagIds,
  mockTagsService,
} from '@kbn/content-list-mock-data/storybook';
import { TagBadge, TagListComponent } from '@kbn/content-management-tags';
import type { Tag } from '@kbn/content-management-tags';
import { ContentListProvider, useContentListConfig } from '../context';
import type { ContentListServices } from '../context';
import { useContentListItems } from '../state';
import { useContentListSort } from '../features/sorting';
import { useContentListPagination } from '../features/pagination';
import { useContentListFilters, useTagFilterToggle } from '../features/filtering';
import type { FindItemsParams, FindItemsResult } from '../datasource';
import { getIncludeExcludeFilter } from '../datasource';

// =============================================================================
// Story Args
// =============================================================================

interface StoryArgs {
  entityName: string;
  entityNamePlural: string;
  hasSorting: boolean;
  hasPagination: boolean;
  hasTags: boolean;
  initialSortField: 'title' | 'updatedAt';
  initialSortDirection: 'asc' | 'desc';
  numberOfItems: number;
  showConfig: boolean;
}

/**
 * Demo component that displays the config context and active filters.
 */
const ConfigDisplay = () => {
  const config = useContentListConfig();
  const { filters } = useContentListFilters();

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <EuiPanel hasBorder paddingSize="s">
          <EuiText size="xs">
            <strong>Config Context:</strong>
            <pre style={{ fontSize: '11px', margin: '8px 0 0' }}>
              {JSON.stringify(
                {
                  id: config.id,
                  labels: config.labels,
                  queryKeyScope: config.queryKeyScope,
                  features: config.features,
                  supports: config.supports,
                },
                null,
                2
              )}
            </pre>
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ minWidth: 250 }}>
        <EuiPanel hasBorder paddingSize="s">
          <EuiText size="xs">
            <strong>Active Filters:</strong>
            <pre style={{ fontSize: '11px', margin: '8px 0 0' }}>
              {JSON.stringify(filters, null, 2)}
            </pre>
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * Lookup map from tag ID to {@link Tag} object for resolving tag badges.
 */
const TAG_MAP = new Map<string, Tag>(MOCK_TAGS.filter((t) => t.id).map((t) => [t.id!, t]));

/**
 * Resolves an array of tag IDs to their {@link Tag} objects.
 */
const resolveTagObjects = (tagIds?: string[]): Tag[] =>
  tagIds?.reduce<Tag[]>((acc, id) => {
    const tag = TAG_MAP.get(id);
    if (tag) {
      acc.push(tag);
    }
    return acc;
  }, []) ?? [];

/**
 * Demo component for filtering by tags using `useTagFilterToggle`.
 *
 * Renders clickable tag badges that toggle include filters. Active tags
 * are visually distinguished. A clear button resets all filters.
 */
const TagControls = () => {
  const { supports } = useContentListConfig();
  const { filters, clearFilters } = useContentListFilters();
  const toggleTag = useTagFilterToggle();

  if (!supports.tags) {
    return (
      <EuiCallOut announceOnMount size="s" color="warning">
        Tags are disabled
      </EuiCallOut>
    );
  }

  const activeIncludes = new Set(getIncludeExcludeFilter(filters.tag)?.include ?? []);

  const handleTagClick = (tag: Tag) => {
    if (!tag.id) {
      return;
    }
    toggleTag(tag.id, tag.name, false);
  };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
      <EuiFlexItem grow={false}>
        <EuiIcon type="tag" aria-label="Tags" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">Filter by tag:</EuiText>
      </EuiFlexItem>
      {MOCK_TAGS.filter((t) => !t.managed && t.id).map((tag) => (
        <EuiFlexItem key={tag.id} grow={false}>
          <TagBadge
            tag={{
              ...tag,
              color: activeIncludes.has(tag.id as string) ? tag.color : '#D3DAE6',
            }}
            onClick={() => handleTagClick(tag)}
          />
        </EuiFlexItem>
      ))}
      {activeIncludes.size > 0 && (
        <EuiFlexItem grow={false}>
          <EuiButton size="s" iconType="cross" onClick={clearFilters}>
            Clear
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

/**
 * Demo component that displays items from the provider.
 */
const ItemsList = () => {
  const { items, totalItems, refetch } = useContentListItems();
  const { supports } = useContentListConfig();
  const toggleTag = useTagFilterToggle();
  const pagination = useContentListPagination();

  const handleTagClick = useCallback(
    (tag: Tag, withModifierKey: boolean) => {
      if (tag.id) {
        toggleTag(tag.id, tag.name, withModifierKey);
      }
    },
    [toggleTag]
  );

  return (
    <div>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{totalItems} items</EuiBadge>
            </EuiFlexItem>
            {pagination.isSupported && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  Page {pagination.pageIndex + 1} ({pagination.pageSize}/page)
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            {pagination.isSupported && pagination.pageIndex > 0 && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  iconType="arrowLeft"
                  onClick={() => pagination.setPageIndex(pagination.pageIndex - 1)}
                >
                  Prev
                </EuiButton>
              </EuiFlexItem>
            )}
            {pagination.isSupported &&
              (pagination.pageIndex + 1) * pagination.pageSize < totalItems && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    iconType="arrowRight"
                    iconSide="right"
                    onClick={() => pagination.setPageIndex(pagination.pageIndex + 1)}
                  >
                    Next
                  </EuiButton>
                </EuiFlexItem>
              )}
            <EuiFlexItem grow={false}>
              <EuiButton size="s" iconType="refresh" onClick={() => refetch()}>
                Refresh
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiBasicTable
        tableCaption="Content list items"
        items={items}
        columns={[
          { field: 'title', name: 'Title', render: (title: string) => <strong>{title}</strong> },
          { field: 'description', name: 'Description' },
          ...(supports.tags
            ? [
                {
                  field: 'tags' as const,
                  name: 'Tags',
                  render: (tagIds: string[] | undefined) => (
                    <TagListComponent tags={resolveTagObjects(tagIds)} onClick={handleTagClick} />
                  ),
                },
              ]
            : []),
          {
            field: 'updatedAt',
            name: 'Updated',
            render: (date: Date | undefined) => (date ? date.toLocaleDateString() : '—'),
          },
        ]}
      />
    </div>
  );
};

/**
 * Demo component that displays sort controls.
 */
const SortControls = () => {
  const { field, direction, setSort } = useContentListSort();
  const { supports } = useContentListConfig();

  if (!supports.sorting) {
    return (
      <EuiCallOut announceOnMount size="s" color="warning">
        Sorting is disabled
      </EuiCallOut>
    );
  }

  const sortOptions = [
    { id: 'title-asc', label: 'Title A-Z' },
    { id: 'title-desc', label: 'Title Z-A' },
    { id: 'updatedAt-desc', label: 'Recently updated' },
    { id: 'updatedAt-asc', label: 'Oldest first' },
  ];

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiIcon type="sortable" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">Sort by:</EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButtonGroup
          legend="Sort options"
          options={sortOptions}
          idSelected={`${field}-${direction}`}
          onChange={(id) => {
            const [newField, newDirection] = id.split('-');
            setSort(newField, newDirection as 'asc' | 'desc');
          }}
          buttonSize="compressed"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const meta: Meta<StoryArgs> = {
  title: 'Content List/Components',
  parameters: { layout: 'padded' },
  argTypes: {
    entityName: { control: 'text', description: 'Singular entity name' },
    entityNamePlural: { control: 'text', description: 'Plural entity name' },
    hasSorting: { control: 'boolean', description: 'Enable sorting feature.' },
    hasPagination: { control: 'boolean', description: 'Enable pagination feature.' },
    hasTags: {
      control: 'boolean',
      description: 'Enable tag filtering. Provides a mock tags service with 8 tags.',
    },
    initialSortField: {
      control: 'select',
      options: ['title', 'updatedAt'],
      description: 'Initial sort field',
    },
    initialSortDirection: {
      control: 'radio',
      options: ['asc', 'desc'],
      description: 'Initial sort direction',
    },
    numberOfItems: {
      control: { type: 'range', min: 0, max: 8, step: 1 },
      description: 'Number of items to display',
    },
    showConfig: { control: 'boolean', description: 'Show config context panel' },
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * Story wrapper component that handles stable prop references.
 */
const ProviderStory = ({ args }: { args: StoryArgs }) => {
  // Memoize labels to maintain stable reference.
  const labels = useMemo(
    () => ({ entity: args.entityName, entityPlural: args.entityNamePlural }),
    [args.entityName, args.entityNamePlural]
  );

  const dataSource = useMemo(() => {
    const mockFindItems = createMockFindItems({
      items: MOCK_DASHBOARDS.slice(0, args.numberOfItems),
    });

    const findItems = async (params: FindItemsParams): Promise<FindItemsResult> => {
      const result = await mockFindItems({
        searchQuery: params.searchQuery,
        filters: params.filters,
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
          tags: extractTagIds(item.references),
        })),
        total: result.total,
        counts: result.counts,
      };
    };

    return { findItems };
  }, [args.numberOfItems]);

  const features = useMemo(
    () => ({
      sorting: args.hasSorting
        ? {
            initialSort: { field: args.initialSortField, direction: args.initialSortDirection },
          }
        : (false as const),
      pagination: args.hasPagination ? { initialPageSize: 5 } : (false as const),
      tags: args.hasTags,
    }),
    [
      args.hasSorting,
      args.hasPagination,
      args.hasTags,
      args.initialSortField,
      args.initialSortDirection,
    ]
  );

  const services: ContentListServices | undefined = useMemo(
    () => (args.hasTags ? { tags: mockTagsService } : undefined),
    [args.hasTags]
  );

  const key = `${args.hasSorting}-${args.hasPagination}-${args.hasTags}-${args.initialSortField}-${args.initialSortDirection}-${args.numberOfItems}`;

  return (
    <ContentListProvider
      key={key}
      id="playground"
      labels={labels}
      dataSource={dataSource}
      features={features}
      services={services}
    >
      {args.showConfig && (
        <>
          <ConfigDisplay />
          <EuiSpacer size="m" />
        </>
      )}
      <SortControls />
      <EuiSpacer size="s" />
      <TagControls />
      <EuiSpacer size="m" />
      <ItemsList />
    </ContentListProvider>
  );
};

export const Provider: Story = {
  args: {
    entityName: 'dashboard',
    entityNamePlural: 'dashboards',
    hasSorting: true,
    hasPagination: true,
    hasTags: true,
    initialSortField: 'title',
    initialSortDirection: 'asc',
    numberOfItems: 8,
    showConfig: true,
  },
  render: (args) => <ProviderStory args={args} />,
};
