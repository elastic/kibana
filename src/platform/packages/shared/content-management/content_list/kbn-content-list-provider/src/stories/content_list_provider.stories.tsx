/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState, useCallback } from 'react';
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
import { useDeleteAction } from '../features/delete';
import type { ContentListItem } from '../item';
import type { FindItemsParams, FindItemsResult } from '../datasource';

interface StoryArgs {
  entityName: string;
  entityNamePlural: string;
  enableSorting: boolean;
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

  return (
    <div>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{totalItems} items</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" iconType="refresh" onClick={() => refetch()}>
            Refresh
          </EuiButton>
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
  title: 'Content Management/Content List',
  parameters: { layout: 'padded' },
  argTypes: {
    entityName: { control: 'text', description: 'Singular entity name' },
    entityNamePlural: { control: 'text', description: 'Plural entity name' },
    enableSorting: { control: 'boolean', description: 'Enable sorting feature' },
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
    () =>
      args.enableSorting
        ? {
            sorting: {
              initialSort: { field: args.initialSortField, direction: args.initialSortDirection },
            },
          }
        : { sorting: false as const },
    [args.enableSorting, args.initialSortField, args.initialSortDirection]
  );

  // Key forces re-mount when configuration changes.
  const key = `${args.enableSorting}-${args.initialSortField}-${args.initialSortDirection}-${args.numberOfItems}`;

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
    initialSortField: 'title',
    initialSortDirection: 'asc',
    numberOfItems: 8,
    showConfig: true,
  },
  render: (args) => <ProviderStory args={args} />,
};

// =============================================================================
// Delete Orchestration Story
// =============================================================================

interface DeleteStoryArgs {
  entityName: string;
  entityNamePlural: string;
  numberOfItems: number;
  enableDelete: boolean;
  isReadOnly: boolean;
  deleteDelay: number;
  deleteShouldFail: boolean;
}

/**
 * Demo component: table with selectable rows and a delete button.
 * Exercises the full `useDeleteAction` → confirmation modal → `onDelete` flow.
 */
const DeleteDemoTable = ({ deleteShouldFail }: { deleteShouldFail: boolean }) => {
  const { items, totalItems } = useContentListItems();
  const { supports } = useContentListConfig();
  const { requestDelete, isSupported, isDeleting } = useDeleteAction();
  const [selectedItems, setSelectedItems] = useState<ContentListItem[]>([]);

  const onSelectionChange = useCallback((newSelection: ContentListItem[]) => {
    setSelectedItems(newSelection);
  }, []);

  return (
    <div>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{totalItems} items</EuiBadge>
            </EuiFlexItem>
            {selectedItems.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="accent">{selectedItems.length} selected</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            {isSupported && selectedItems.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  color="danger"
                  iconType="trash"
                  isLoading={isDeleting}
                  onClick={() => requestDelete(selectedItems)}
                >
                  Delete {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'}
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {!isSupported && (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            color="warning"
            title={
              supports.delete
                ? 'Delete is supported but the hook reports otherwise (unexpected).'
                : 'Delete is not supported. Provide `item.onDelete` and ensure `isReadOnly` is false.'
            }
          />
          <EuiSpacer size="m" />
        </>
      )}

      <EuiBasicTable
        tableCaption="Content list items with delete"
        items={items}
        itemId="id"
        columns={[
          {
            field: 'title',
            name: 'Title',
            render: (title: string) => <strong>{title}</strong>,
          },

          ...(isSupported
            ? [
                {
                  name: 'Actions',
                  render: (item: ContentListItem) => (
                    <EuiButton
                      size="s"
                      color="danger"
                      iconType="trash"
                      iconSize="s"
                      onClick={() => requestDelete([item])}
                      aria-label={`Delete ${item.title}`}
                    >
                      Delete
                    </EuiButton>
                  ),
                },
              ]
            : []),
        ]}
        selection={
          isSupported
            ? {
                onSelectionChange,
                selectable: () => true,
                selectableMessage: () => 'Select this item',
              }
            : undefined
        }
      />

      {deleteShouldFail && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            announceOnMount
            size="s"
            color="danger"
            title="⚠ Delete will fail (toggle in controls)"
          />
        </>
      )}
    </div>
  );
};

/**
 * Story wrapper for the delete orchestration demo.
 */
const DeleteStory = ({ args }: { args: DeleteStoryArgs }) => {
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
        filters: {},
        sort: params.sort ?? { field: 'title', direction: 'asc' },
        page: params.page,
      });
      return {
        items: result.items.map((mockItem) => ({
          id: mockItem.id,
          title: mockItem.attributes.title,
          description: mockItem.attributes.description,
          type: mockItem.type,
          updatedAt: mockItem.updatedAt ? new Date(mockItem.updatedAt) : undefined,
        })),
        total: result.total,
      };
    };

    return { findItems };
  }, [args.numberOfItems]);

  // Build `item` config -- `onDelete` is only provided when `enableDelete` is true.
  const item = useMemo(() => {
    if (!args.enableDelete) {
      return undefined;
    }

    const onDelete = async (items: ContentListItem[]): Promise<void> => {
      // Simulate async delete with configurable delay.
      await new Promise((resolve) => setTimeout(resolve, args.deleteDelay));
      if (args.deleteShouldFail) {
        throw new Error('Simulated delete failure');
      }
      // eslint-disable-next-line no-console
      console.log(
        `[Storybook] Deleted ${items.length} item(s):`,
        items.map((i) => i.title)
      );
    };

    return { onDelete };
  }, [args.enableDelete, args.deleteDelay, args.deleteShouldFail]);

  const key = `${args.enableDelete}-${args.isReadOnly}-${args.numberOfItems}-${args.deleteShouldFail}`;

  return (
    <ContentListProvider
      key={key}
      id="delete-demo"
      labels={labels}
      dataSource={dataSource}
      item={item}
      isReadOnly={args.isReadOnly}
    >
      <DeleteDemoTable deleteShouldFail={args.deleteShouldFail} />
    </ContentListProvider>
  );
};

export const DeleteOrchestration: StoryObj<DeleteStoryArgs> = {
  args: {
    entityName: 'dashboard',
    entityNamePlural: 'dashboards',
    numberOfItems: 6,
    enableDelete: true,
    isReadOnly: false,
    deleteDelay: 800,
    deleteShouldFail: false,
  },
  argTypes: {
    entityName: { control: 'text', description: 'Singular entity name.' },
    entityNamePlural: { control: 'text', description: 'Plural entity name.' },
    numberOfItems: {
      control: { type: 'range', min: 1, max: 8, step: 1 },
      description: 'Number of items to display.',
    },
    enableDelete: {
      control: 'boolean',
      description: 'Provide `item.onDelete` to enable the delete feature.',
    },
    isReadOnly: {
      control: 'boolean',
      description: 'Set `isReadOnly` on the provider (disables delete even with `onDelete`).',
    },
    deleteDelay: {
      control: { type: 'range', min: 0, max: 5000, step: 100 },
      description: 'Simulated delete latency (ms).',
    },
    deleteShouldFail: {
      control: 'boolean',
      description: 'Make the simulated delete throw an error.',
    },
  },
  render: (args) => <DeleteStory args={args} />,
};
