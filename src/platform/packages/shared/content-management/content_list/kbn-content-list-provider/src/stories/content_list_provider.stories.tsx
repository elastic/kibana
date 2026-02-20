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
import { MOCK_DASHBOARDS, createMockFindItems } from '@kbn/content-list-mock-data/storybook';
import { ContentListProvider, useContentListConfig } from '../context';
import { useContentListItems } from '../state';
import { useContentListSort } from '../features/sorting';
import { useContentListPagination } from '../features/pagination';
import type { FindItemsParams, FindItemsResult } from '../datasource';

interface StoryArgs {
  entityName: string;
  entityNamePlural: string;
  enableSorting: boolean;
  enablePagination: boolean;
  initialSortField: 'title' | 'updatedAt';
  initialSortDirection: 'asc' | 'desc';
  numberOfItems: number;
  showConfig: boolean;
}

/**
 * Demo component that displays the config context.
 */
const ConfigDisplay = () => {
  const config = useContentListConfig();

  return (
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
  );
};

/**
 * Demo component that displays items from the provider.
 */
const ItemsList = () => {
  const { items, totalItems, refetch } = useContentListItems();
  const pagination = useContentListPagination();

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
        <EuiIcon type="sortable" aria-label="Sortable" />
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
  title: 'Content Management/Content List',
  parameters: { layout: 'padded' },
  argTypes: {
    entityName: { control: 'text', description: 'Singular entity name' },
    entityNamePlural: { control: 'text', description: 'Plural entity name' },
    enableSorting: { control: 'boolean', description: 'Enable sorting feature' },
    enablePagination: { control: 'boolean', description: 'Enable pagination feature' },
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

  // Memoize dataSource to maintain stable reference.
  const dataSource = useMemo(() => {
    const mockFindItems = createMockFindItems({
      items: MOCK_DASHBOARDS.slice(0, args.numberOfItems),
    });

    const findItems = async (params: FindItemsParams): Promise<FindItemsResult> => {
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

    return { findItems };
  }, [args.numberOfItems]);

  // Memoize features to maintain stable reference.
  const features = useMemo(
    () => ({
      sorting: args.enableSorting
        ? {
            initialSort: { field: args.initialSortField, direction: args.initialSortDirection },
          }
        : (false as const),
      pagination: args.enablePagination ? { initialPageSize: 5 } : (false as const),
    }),
    [args.enableSorting, args.enablePagination, args.initialSortField, args.initialSortDirection]
  );

  // Key forces re-mount when configuration changes.
  const key = `${args.enableSorting}-${args.enablePagination}-${args.initialSortField}-${args.initialSortDirection}-${args.numberOfItems}`;

  return (
    <ContentListProvider
      key={key}
      id="playground"
      labels={labels}
      dataSource={dataSource}
      features={features}
    >
      {args.showConfig && (
        <>
          <ConfigDisplay />
          <EuiSpacer size="m" />
        </>
      )}
      <SortControls />
      <EuiSpacer size="m" />
      <ItemsList />
    </ContentListProvider>
  );
};

export const Provider: Story = {
  args: {
    entityName: 'dashboard',
    entityNamePlural: 'dashboards',
    enableSorting: true,
    enablePagination: true,
    initialSortField: 'title',
    initialSortDirection: 'asc',
    numberOfItems: 8,
    showConfig: true,
  },
  render: (args) => <ProviderStory args={args} />,
};
