/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import {
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
} from '@elastic/eui';
import {
  ContentListProvider,
  useContentListItems,
  useContentListSearch,
  useContentListSort,
  useContentListSelection,
  useContentListFilters,
  type FindItemsFn,
} from '@kbn/content-list-provider';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import {
  DASHBOARD_MOCK_SEARCH_RESPONSE as mockDashboards,
  MOCK_USER_PROFILES_MAP,
  MOCK_USER_PROFILES,
  createMockServices,
} from '@kbn/content-list-mock-data';
import { ContentListToolbar, NULL_USER } from '.';

const mockServices = createMockServices();

/**
 * Build a map of email → uid for user profile lookup.
 * Used to resolve email-based createdBy filters to user IDs.
 */
const EMAIL_TO_UID_MAP: Record<string, string> = MOCK_USER_PROFILES.reduce<Record<string, string>>(
  (acc, profile) => {
    if (profile.user.email) {
      acc[profile.user.email] = profile.uid;
    }
    return acc;
  },
  {}
);

/**
 * Check if an item's creator matches the filter values.
 * Handles both email and uid filter values for backwards compatibility.
 */
function matchesUserFilter(itemCreatedBy: string | undefined, filterValues: string[]): boolean {
  // Resolve all filter values to uids (handles both email and uid)
  const resolvedUids = filterValues
    .filter((v) => v !== NULL_USER)
    .map((v) => EMAIL_TO_UID_MAP[v] ?? v); // Email → uid, or keep as-is if already uid

  // Check if NULL_USER is in the filter (matches items without creator)
  const includesNullUser = filterValues.includes(NULL_USER);

  // Item has no creator
  if (!itemCreatedBy) {
    return includesNullUser;
  }

  // Check if item's createdBy matches any resolved uid
  return resolvedUids.includes(itemCreatedBy);
}

const mockFindItems: FindItemsFn<UserContentCommonSchema> = async ({
  searchQuery,
  filters,
  sort,
  page,
}) => {
  let items = [...mockDashboards.result.result.hits];

  // Apply search query filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    items = items.filter(
      (item) =>
        item.attributes.title?.toLowerCase().includes(query) ||
        item.attributes.description?.toLowerCase().includes(query)
    );
  }

  // Apply tag include filters
  if (filters.tags?.include && filters.tags.include.length > 0) {
    items = items.filter((item) =>
      filters.tags?.include.some((tag) => item.references?.some((ref) => ref.id === tag))
    );
  }

  // Apply tag exclude filters
  if (filters.tags?.exclude && filters.tags.exclude.length > 0) {
    items = items.filter(
      (item) => !filters.tags?.exclude.some((tag) => item.references?.some((ref) => ref.id === tag))
    );
  }

  // Apply user filters (createdBy) - supports both email and uid filter values
  if (filters.users && filters.users.length > 0) {
    items = items.filter((item) => matchesUserFilter(item.createdBy, filters.users!));
  }

  // Apply sorting
  items.sort((a, b) => {
    const getFieldValue = (item: UserContentCommonSchema, field: string) => {
      if (field in item) {
        return item[field as keyof UserContentCommonSchema];
      }
      if (field in item.attributes) {
        return item.attributes[field as keyof typeof item.attributes];
      }
      return undefined;
    };

    const aValue = getFieldValue(a, sort.field);
    const bValue = getFieldValue(b, sort.field);

    if (aValue === undefined || bValue === undefined) {
      return 0;
    }

    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    return sort.direction === 'asc' ? comparison : -comparison;
  });

  // Apply pagination
  const total = items.length;
  const start = page.index * page.size;
  const end = start + page.size;
  const paginatedItems = items.slice(start, end);

  return {
    items: paginatedItems,
    total,
  };
};

const meta: Meta = {
  title: 'Content Management/Content List/Toolbar',
  decorators: [
    (Story) => (
      <div style={{ padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

/**
 * State Display Panel - Shows current provider state
 */
function StateDisplayPanel() {
  const { items, totalItems } = useContentListItems();
  const { queryText } = useContentListSearch();
  const { field: sortField, direction: sortDirection } = useContentListSort();
  const { selectedCount, getSelectedItems } = useContentListSelection();
  const { filters } = useContentListFilters();

  const selectedItems = getSelectedItems();

  return (
    <>
      <EuiSpacer size="l" />
      <EuiPanel color="subdued" hasBorder>
        <EuiTitle size="xs">
          <h3>Current State</h3>
        </EuiTitle>
        <EuiSpacer size="m" />

        <EuiFlexGroup gutterSize="m" wrap>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>Search Query:</strong>{' '}
              {queryText ? <EuiBadge color="primary">{queryText}</EuiBadge> : <em>none</em>}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>Sort:</strong> {sortField} ({sortDirection})
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>Selected:</strong>{' '}
              {selectedCount > 0 ? (
                <EuiBadge color="primary">{selectedCount}</EuiBadge>
              ) : (
                <EuiBadge color="hollow">0</EuiBadge>
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>Items:</strong> {items.length} / {totalItems}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        <EuiFlexGroup gutterSize="m" wrap>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>Include Tags:</strong>{' '}
              {filters.tags?.include && filters.tags.include.length > 0 ? (
                filters.tags.include.map((tag) => (
                  <EuiBadge key={tag} color="success">
                    {tag}
                  </EuiBadge>
                ))
              ) : (
                <em>none</em>
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>Exclude Tags:</strong>{' '}
              {filters.tags?.exclude && filters.tags.exclude.length > 0 ? (
                filters.tags.exclude.map((tag) => (
                  <EuiBadge key={tag} color="danger">
                    {tag}
                  </EuiBadge>
                ))
              ) : (
                <em>none</em>
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>Created By:</strong>{' '}
              {filters.users && filters.users.length > 0 ? (
                filters.users.map((filterValue) => {
                  // Look up profile by uid first, then by email
                  const resolvedUid = EMAIL_TO_UID_MAP[filterValue] ?? filterValue;
                  const profile = MOCK_USER_PROFILES_MAP[resolvedUid];
                  return (
                    <EuiBadge key={filterValue} color="primary">
                      {filterValue === NULL_USER
                        ? 'No creator'
                        : profile?.user.full_name || filterValue}
                    </EuiBadge>
                  );
                })
              ) : (
                <em>none</em>
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>Starred Only:</strong>{' '}
              {filters.favoritesOnly ? <EuiBadge color="warning">Yes</EuiBadge> : <em>No</em>}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        {selectedItems.length > 0 && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="xs">
              <strong>Selected Items:</strong> {selectedItems.map((item) => item.title).join(', ')}
            </EuiText>
          </>
        )}
      </EuiPanel>
    </>
  );
}

interface PlaygroundArgs {
  enableSearch: boolean;
  searchPlaceholder: string;
  enableSorting: boolean;
  enableTagFilter: boolean;
  enableCreatedByFilter: boolean;
  enableFavorites: boolean;
  enableSelection: boolean;
  enableExport: boolean;
  isReadOnly: boolean;
  useCustomLayout: boolean;
}

/**
 * Interactive Playground Story
 */
export const Playground: StoryObj<PlaygroundArgs> = {
  render: (args) => {
    const { Filters, SelectionActions, SelectionAction } = ContentListToolbar;

    // Custom layout: Declarative filter order and selection actions
    const customToolbar = (
      <ContentListToolbar>
        <SelectionActions>
          <SelectionAction.Delete />
        </SelectionActions>
        <Filters>
          <Filters.Sort />
          <Filters.Tags />
          <Filters.CreatedBy />
          <Filters.Starred />
        </Filters>
      </ContentListToolbar>
    );

    // Build features config based on enabled options.
    const features = {
      search: args.enableSearch ? { placeholder: args.searchPlaceholder } : false,
      sorting: args.enableSorting
        ? {
            fields: [
              { field: 'title', name: 'Name' },
              { field: 'updatedAt', name: 'Updated' },
            ],
            initialSort: { field: 'title', direction: 'asc' as const },
          }
        : false,
      filtering:
        args.enableTagFilter || args.enableCreatedByFilter
          ? {
              tags: args.enableTagFilter,
              users: args.enableCreatedByFilter,
            }
          : false,
      starred: args.enableFavorites,
      selection: args.enableSelection
        ? {
            onSelectionDelete: action('delete-items'),
            onSelectionExport: args.enableExport ? action('export-items') : undefined,
          }
        : undefined,
    };

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{
          findItems: mockFindItems,
        }}
        services={mockServices}
        features={features}
        isReadOnly={args.isReadOnly}
      >
        <EuiTitle>
          <h2>ContentListToolbar Playground</h2>
        </EuiTitle>
        <EuiText color="subdued">
          <p>
            Use the controls panel to customize the toolbar features.
            {args.useCustomLayout
              ? ' Custom layout mode uses declarative compound components to specify filter order and selection actions.'
              : ' The toolbar will automatically render based on the enabled features.'}
          </p>
        </EuiText>

        <EuiSpacer size="l" />

        <EuiPanel hasBorder>
          {args.useCustomLayout ? customToolbar : <ContentListToolbar />}
        </EuiPanel>

        <StateDisplayPanel />
      </ContentListProvider>
    );
  },
  args: {
    enableSearch: true,
    searchPlaceholder: 'Search dashboards...',
    enableSorting: true,
    enableTagFilter: true,
    enableCreatedByFilter: true,
    enableFavorites: true,
    enableSelection: true,
    enableExport: true,
    isReadOnly: false,
    useCustomLayout: false,
  },
  argTypes: {
    useCustomLayout: {
      control: 'boolean',
      description:
        'Use declarative compound components for custom configuration (demonstrates Toolbar.Filters, Toolbar.SelectionActions)',
      table: {
        category: 'Layout',
        defaultValue: { summary: 'false' },
      },
    },
    enableSearch: {
      control: 'boolean',
      description: 'Enable search functionality',
      table: {
        category: 'Search',
        defaultValue: { summary: 'true' },
      },
    },
    searchPlaceholder: {
      control: 'text',
      description: 'Placeholder text for search input',
      if: { arg: 'enableSearch' },
      table: {
        category: 'Search',
      },
    },
    enableSorting: {
      control: 'boolean',
      description: 'Enable sort filter dropdown',
      table: {
        category: 'Filters',
        defaultValue: { summary: 'true' },
      },
    },
    enableTagFilter: {
      control: 'boolean',
      description: 'Enable tag filter dropdown',
      table: {
        category: 'Filters',
        defaultValue: { summary: 'true' },
      },
    },
    enableCreatedByFilter: {
      control: 'boolean',
      description: 'Enable "Created by" user filter dropdown',
      table: {
        category: 'Filters',
        defaultValue: { summary: 'true' },
      },
    },
    enableFavorites: {
      control: 'boolean',
      description: 'Enable starred filter toggle',
      table: {
        category: 'Filters',
        defaultValue: { summary: 'true' },
      },
    },
    enableSelection: {
      control: 'boolean',
      description: 'Enable item selection and bulk actions',
      table: {
        category: 'Bulk Actions',
        defaultValue: { summary: 'true' },
      },
    },
    enableExport: {
      control: 'boolean',
      description: 'Enable export bulk action',
      if: { arg: 'enableSelection' },
      table: {
        category: 'Bulk Actions',
        defaultValue: { summary: 'true' },
      },
    },
    isReadOnly: {
      control: 'boolean',
      description: 'Set the list to read-only mode (disables bulk actions)',
      table: {
        category: 'Bulk Actions',
        defaultValue: { summary: 'false' },
      },
    },
  },
};
