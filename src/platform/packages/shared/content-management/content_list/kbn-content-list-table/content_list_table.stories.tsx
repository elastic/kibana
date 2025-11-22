/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import {
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiButtonIcon,
  EuiCallOut,
  EuiLoadingSpinner,
} from '@elastic/eui';
import {
  ContentListProvider,
  useContentListItems,
  useContentListSearch,
  useContentListFilters,
  useContentListSort,
  useContentListPagination,
  useContentListConfig,
  useContentListSelection,
} from '@kbn/content-list-provider';
import type { ContentListItem, FindItemsFn } from '@kbn/content-list-provider';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import { TagList } from '@kbn/content-management-tags';
import {
  DASHBOARD_MOCK_SEARCH_RESPONSE as mockDashboards,
  TAG_MOCK_SEARCH_RESPONSE as mockTags,
  MOCK_USER_PROFILES,
  createMockServices,
  mockFavoritesClient,
} from '@kbn/content-list-mock-data';
import { ContentListTable, type ContentListTableProps } from './content_list_table';
import type { RenderDetailsFunction } from './hooks';

// =============================================================================
// Mock Data & Helpers
// =============================================================================

const mockServices = createMockServices({ tagList: mockTags.tags });

/** Sentinel value for filtering items without a creator. */
const NULL_USER = '__null_user__';

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
 * Resolve a filter value (email or uid) to a user ID.
 * Supports both email-based filtering (new) and uid-based filtering (legacy).
 */
const resolveToUid = (filterValue: string): string | undefined => {
  // If it's an email, resolve to uid.
  if (EMAIL_TO_UID_MAP[filterValue]) {
    return EMAIL_TO_UID_MAP[filterValue];
  }
  // If it's already a uid (or unknown value), return as-is.
  return filterValue;
};

/**
 * Check if an item's creator matches the filter values.
 * Handles both email and uid filter values for backwards compatibility.
 */
const matchesUserFilter = (itemCreatedBy: string | undefined, filterValues: string[]): boolean => {
  // Resolve all filter values to uids.
  const resolvedUids = filterValues
    .filter((v) => v !== NULL_USER)
    .map(resolveToUid)
    .filter((uid): uid is string => uid !== undefined);

  // Check if NULL_USER is in the filter (matches items without creator).
  const includesNullUser = filterValues.includes(NULL_USER);

  // Item has no creator.
  if (!itemCreatedBy) {
    return includesNullUser;
  }

  // Check if item's createdBy matches any resolved uid.
  return resolvedUids.includes(itemCreatedBy);
};

/**
 * Compares two values for sorting, handling undefined/null gracefully.
 * Uses locale-aware string comparison for better sorting of titles.
 */
const compareValues = (a: unknown, b: unknown, direction: 'asc' | 'desc'): number => {
  const aVal = a ?? '';
  const bVal = b ?? '';

  let comparison: number;
  if (typeof aVal === 'string' && typeof bVal === 'string') {
    comparison = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
  } else if (aVal < bVal) {
    comparison = -1;
  } else if (aVal > bVal) {
    comparison = 1;
  } else {
    comparison = 0;
  }

  return direction === 'desc' ? -comparison : comparison;
};

/**
 * Get a field value from an item using dot-notation path.
 * Checks top-level properties first, then attributes.
 */
const getFieldValue = (item: UserContentCommonSchema, field: string): unknown => {
  // Check top-level first.
  if (field in item) {
    return item[field as keyof UserContentCommonSchema];
  }
  // Check attributes.
  if (field in item.attributes) {
    return item.attributes[field as keyof typeof item.attributes];
  }
  return undefined;
};

/**
 * Creates a mock `findItems` function with configurable behavior.
 * Implements all filters that the real `createDefaultFindItems` supports:
 * - Text search (title, description)
 * - Tag filtering (include/exclude)
 * - User filtering (createdBy) with email-to-uid resolution
 * - Favorites filtering
 * - Sorting (locale-aware for strings)
 * - Pagination
 */
const createMockFindItems = (options?: {
  delay?: number;
  shouldError?: boolean;
  isEmpty?: boolean;
}): FindItemsFn<UserContentCommonSchema> => {
  const { delay = 0, shouldError = false, isEmpty = false } = options ?? {};

  return async ({ searchQuery, filters, sort, page }) => {
    // Simulate network delay.
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Simulate error.
    if (shouldError) {
      throw new Error('Failed to fetch items. Please try again.');
    }

    // Return empty for "no items" state.
    if (isEmpty) {
      return { items: [], total: 0 };
    }

    let items = [...mockDashboards.result.result.hits];

    // Apply search query filter.
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.attributes.title?.toLowerCase().includes(query) ||
          item.attributes.description?.toLowerCase().includes(query)
      );
    }

    // Apply tag filters (include/exclude).
    if (filters.tags) {
      const { include = [], exclude = [] } = filters.tags;

      if (include.length > 0) {
        items = items.filter((item) =>
          include.some((tagId) => item.references?.some((ref) => ref.id === tagId))
        );
      }

      if (exclude.length > 0) {
        items = items.filter(
          (item) => !exclude.some((tagId) => item.references?.some((ref) => ref.id === tagId))
        );
      }
    }

    // Apply user filters (createdBy) with email-to-uid resolution.
    if (filters.users && filters.users.length > 0) {
      items = items.filter((item) => matchesUserFilter(item.createdBy, filters.users!));
    }

    // Apply favorites filter.
    if (filters.favoritesOnly) {
      const favorites = await mockFavoritesClient.getFavorites();
      items = items.filter((item) => favorites.favoriteIds.includes(item.id));
    }

    // Apply sorting with locale-aware string comparison.
    items = [...items].sort((a, b) => {
      const aValue = getFieldValue(a, sort.field);
      const bValue = getFieldValue(b, sort.field);
      return compareValues(aValue, bValue, sort.direction);
    });

    // Apply pagination.
    const total = items.length;
    const start = page.index * page.size;
    const end = start + page.size;
    const paginatedItems = items.slice(start, end);

    return { items: paginatedItems, total };
  };
};

const mockFindItems = createMockFindItems();

// =============================================================================
// State Diagnostic Panel
// =============================================================================

/**
 * Collapsible diagnostic panel to visualize the current provider state.
 */
const StateDiagnosticPanel = ({ defaultOpen = false }: { defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { items, totalItems, isLoading, error } = useContentListItems();
  const { queryText } = useContentListSearch();
  const { filters } = useContentListFilters();
  const { field: sortField, direction: sortDirection } = useContentListSort();
  const { index: pageIndex, size: pageSize } = useContentListPagination();
  const config = useContentListConfig();
  const { selectedCount, getSelectedItems } = useContentListSelection();

  const selectedItems = getSelectedItems();

  return (
    <>
      <EuiSpacer size="l" />
      <EuiPanel color="subdued" hasBorder paddingSize={isOpen ? 'm' : 's'}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType={isOpen ? 'arrowDown' : 'arrowRight'}
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'Collapse diagnostic panel' : 'Expand diagnostic panel'}
              size="s"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h3>State Diagnostic Panel</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {items.length}/{totalItems} items
                </EuiBadge>
              </EuiFlexItem>
              {selectedCount > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="primary">{selectedCount} selected</EuiBadge>
                </EuiFlexItem>
              )}
              {isLoading && (
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="s" />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        {isOpen && (
          <>
            <EuiSpacer size="m" />

            <EuiFlexGroup gutterSize="m" wrap>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>Read-Only:</strong>{' '}
                  {config.isReadOnly ? (
                    <EuiBadge color="warning">Yes</EuiBadge>
                  ) : (
                    <EuiBadge color="hollow">No</EuiBadge>
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiTitle size="xxs">
                  <h4>Search</h4>
                </EuiTitle>
                <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
                  {JSON.stringify({ queryText }, null, 2)}
                </EuiCodeBlock>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiTitle size="xxs">
                  <h4>Filters</h4>
                </EuiTitle>
                <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
                  {JSON.stringify(filters, null, 2)}
                </EuiCodeBlock>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiTitle size="xxs">
                  <h4>Sort</h4>
                </EuiTitle>
                <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
                  {JSON.stringify({ field: sortField, direction: sortDirection }, null, 2)}
                </EuiCodeBlock>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiTitle size="xxs">
                  <h4>Pagination</h4>
                </EuiTitle>
                <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
                  {JSON.stringify({ index: pageIndex, size: pageSize }, null, 2)}
                </EuiCodeBlock>
              </EuiFlexItem>
            </EuiFlexGroup>

            {selectedCount > 0 && (
              <>
                <EuiSpacer size="m" />
                <EuiTitle size="xxs">
                  <h4>Selected Items ({selectedCount})</h4>
                </EuiTitle>
                <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
                  {JSON.stringify(
                    selectedItems.map((item) => ({
                      id: item.id,
                      title: item.title,
                      type: item.type,
                    })),
                    null,
                    2
                  )}
                </EuiCodeBlock>
              </>
            )}

            {error && (
              <>
                <EuiSpacer size="m" />
                <EuiTitle size="xxs">
                  <h4>Error</h4>
                </EuiTitle>
                <EuiCodeBlock language="text" fontSize="s" paddingSize="s" color="danger">
                  {error.message}
                </EuiCodeBlock>
              </>
            )}
          </>
        )}
      </EuiPanel>
    </>
  );
};

// =============================================================================
// Storybook Meta
// =============================================================================

const meta: Meta = {
  title: 'Content Management/Content List/Table',
  decorators: [
    (Story) => (
      <div style={{ padding: '20px', maxWidth: '1200px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

// =============================================================================
// Playground Story
// =============================================================================

interface PlaygroundArgs {
  // Entity
  entityName: string;
  entityNamePlural: string;

  // State
  hasItems: boolean;
  isLoading: boolean;
  isReadOnly: boolean;

  // Table appearance
  compressed: boolean;
  tableLayout: 'auto' | 'fixed';

  // Columns
  showDescription: boolean;
  showTags: boolean;
  showStarred: boolean;
  showCreatedBy: boolean;
  showUpdatedAt: boolean;

  // Row features
  hasClickableRows: boolean;
  hasExpandableRows: boolean;

  // Row actions
  hasRowActions: boolean;
  hasViewDetails: boolean;
  hasEdit: boolean;
  hasDuplicate: boolean;
  hasExport: boolean;
  hasDelete: boolean;

  // Selection
  hasSelection: boolean;
  hasBulkDelete: boolean;
  hasBulkExport: boolean;

  // Diagnostics
  showDiagnostics: boolean;
}

type PlaygroundStory = StoryObj<PlaygroundArgs>;

/**
 * Interactive playground to explore all table features and configurations.
 * Use the controls panel to toggle different features and observe behavior.
 */
export const Playground: PlaygroundStory = {
  args: {
    // Entity
    entityName: 'dashboard',
    entityNamePlural: 'dashboards',

    // State
    hasItems: true,
    isLoading: false,
    isReadOnly: false,

    // Table appearance
    compressed: false,
    tableLayout: 'auto',

    // Columns
    showDescription: true,
    showTags: false,
    showStarred: false,
    showCreatedBy: false,
    showUpdatedAt: true,

    // Row features
    hasClickableRows: true,
    hasExpandableRows: false,

    // Row actions
    hasRowActions: true,
    hasViewDetails: false,
    hasEdit: true,
    hasDuplicate: true,
    hasExport: false,
    hasDelete: true,

    // Selection
    hasSelection: false,
    hasBulkDelete: true,
    hasBulkExport: true,

    // Diagnostics
    showDiagnostics: true,
  },
  argTypes: {
    // Entity group
    entityName: {
      control: 'text',
      description: 'Singular entity name for display',
      table: { category: 'Entity' },
    },
    entityNamePlural: {
      control: 'text',
      description: 'Plural entity name for display',
      table: { category: 'Entity' },
    },

    // State group
    hasItems: {
      control: 'boolean',
      description: 'Whether data exists (false shows empty state)',
      table: { category: 'State' },
    },
    isLoading: {
      control: 'boolean',
      description: 'Show loading state',
      table: { category: 'State' },
    },
    isReadOnly: {
      control: 'boolean',
      description: 'Disable all editing and selection',
      table: { category: 'State' },
    },

    // Appearance group
    compressed: {
      control: 'boolean',
      description: 'Use compact table style',
      table: { category: 'Appearance' },
    },
    tableLayout: {
      control: 'radio',
      options: ['auto', 'fixed'],
      description: 'Table column sizing strategy',
      table: { category: 'Appearance' },
    },

    // Columns group
    showDescription: {
      control: 'boolean',
      description: 'Show description in Name column',
      table: { category: 'Columns' },
    },
    showTags: {
      control: 'boolean',
      description: 'Show tags in Name column',
      table: { category: 'Columns' },
    },
    showStarred: {
      control: 'boolean',
      description: 'Show starred button in Name column',
      table: { category: 'Columns' },
    },
    showCreatedBy: {
      control: 'boolean',
      description: 'Include CreatedBy column',
      table: { category: 'Columns' },
    },
    showUpdatedAt: {
      control: 'boolean',
      description: 'Include UpdatedAt column',
      table: { category: 'Columns' },
    },

    // Row features group
    hasClickableRows: {
      control: 'boolean',
      description: 'Make row titles clickable links',
      table: { category: 'Row Features' },
    },
    hasExpandableRows: {
      control: 'boolean',
      description: 'Enable row expansion with details',
      table: { category: 'Row Features' },
    },

    // Actions group
    hasRowActions: {
      control: 'boolean',
      description: 'Show row action buttons',
      table: { category: 'Actions' },
    },
    hasViewDetails: {
      control: 'boolean',
      description: 'Include View Details action',
      table: { category: 'Actions' },
    },
    hasEdit: {
      control: 'boolean',
      description: 'Include Edit action',
      table: { category: 'Actions' },
    },
    hasDuplicate: {
      control: 'boolean',
      description: 'Include Duplicate action',
      table: { category: 'Actions' },
    },
    hasExport: {
      control: 'boolean',
      description: 'Include Export action',
      table: { category: 'Actions' },
    },
    hasDelete: {
      control: 'boolean',
      description: 'Include Delete action',
      table: { category: 'Actions' },
    },

    // Selection group
    hasSelection: {
      control: 'boolean',
      description: 'Enable row checkboxes for selection',
      table: { category: 'Selection' },
    },
    hasBulkDelete: {
      control: 'boolean',
      description: 'Enable bulk delete action',
      table: { category: 'Selection' },
    },
    hasBulkExport: {
      control: 'boolean',
      description: 'Enable bulk export action',
      table: { category: 'Selection' },
    },

    // Diagnostics
    showDiagnostics: {
      control: 'boolean',
      description: 'Show state diagnostic panel',
      table: { category: 'Debug' },
    },
  },
  render: (args) => {
    const { Column, Action } = ContentListTable;

    // Create findItems based on state controls.
    const findItems: FindItemsFn = async (params) => {
      if (args.isLoading) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
      if (!args.hasItems) {
        return { items: [], total: 0 };
      }
      return mockFindItems(params);
    };

    // Build item config.
    const getHref = args.hasClickableRows
      ? (item: ContentListItem) => `#/${args.entityName}/${item.id}`
      : undefined;

    const actions = args.hasRowActions
      ? {
          ...(args.hasViewDetails && {
            onViewDetails: (item: ContentListItem) =>
              action('onViewDetails')(`View: ${item.title}`),
          }),
          ...(args.hasEdit && {
            onEdit: (item: ContentListItem) => action('onEdit')(`Edit: ${item.title}`),
          }),
          ...(args.hasDuplicate && {
            onDuplicate: (item: ContentListItem) =>
              action('onDuplicate')(`Duplicate: ${item.title}`),
          }),
          ...(args.hasExport && {
            onExport: (item: ContentListItem) => action('onExport')(`Export: ${item.title}`),
          }),
          ...(args.hasDelete && {
            onDelete: (item: ContentListItem) => action('onDelete')(`Delete: ${item.title}`),
          }),
        }
      : undefined;

    const itemConfig = {
      ...(getHref && { getHref }),
      ...(args.hasClickableRows && {
        onClick: (item: ContentListItem) => action('onClick')(`Navigate to: ${item.title}`),
      }),
      ...(actions && Object.keys(actions).length > 0 && { actions }),
    };

    // Build selection config.
    const selectionConfig = args.hasSelection
      ? {
          ...(args.hasBulkDelete && {
            onSelectionDelete: (items: ContentListItem[]) =>
              action('onSelectionDelete')(`Delete ${items.length} items`),
          }),
          ...(args.hasBulkExport && {
            onSelectionExport: (items: ContentListItem[]) =>
              action('onSelectionExport')(`Export ${items.length} items`),
          }),
        }
      : undefined;

    // Build renderDetails for expandable rows.
    const renderDetails = args.hasExpandableRows
      ? (item: ContentListItem) => (
          <EuiPanel color="subdued" paddingSize="m">
            <EuiText size="s">
              <strong>Details for:</strong> {item.title}
            </EuiText>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              {item.description || 'No description available.'}
            </EuiText>
          </EuiPanel>
        )
      : undefined;

    // Build columns dynamically.
    const buildColumns = () => {
      const columns: React.ReactNode[] = [];

      // Add expander column if expandable rows enabled.
      if (args.hasExpandableRows) {
        columns.push(<Column.Expander key="expander" />);
      }

      // Name column with configurable features.
      columns.push(
        <Column.Name
          key="name"
          showDescription={args.showDescription}
          showTags={args.showTags}
          showStarred={args.showStarred}
        />
      );

      // Optional CreatedBy column.
      if (args.showCreatedBy) {
        columns.push(<Column.CreatedBy key="createdBy" />);
      }

      // Optional UpdatedAt column.
      if (args.showUpdatedAt) {
        columns.push(<Column.UpdatedAt key="updatedAt" />);
      }

      // Actions column if any actions enabled.
      if (args.hasRowActions) {
        const actionElements: React.ReactNode[] = [];

        if (args.hasViewDetails) {
          actionElements.push(<Action.ViewDetails key="viewDetails" />);
        }
        if (args.hasEdit) {
          actionElements.push(<Action.Edit key="edit" />);
        }
        if (args.hasDuplicate) {
          actionElements.push(<Action.Duplicate key="duplicate" />);
        }
        if (args.hasExport) {
          actionElements.push(<Action.Export key="export" />);
        }
        if (args.hasDelete) {
          actionElements.push(<Action.Delete key="delete" />);
        }

        if (actionElements.length > 0) {
          columns.push(<Column.Actions key="actions">{actionElements}</Column.Actions>);
        }
      }

      return columns;
    };

    return (
      <ContentListProvider
        entityName={args.entityName}
        entityNamePlural={args.entityNamePlural}
        dataSource={{ findItems }}
        isReadOnly={args.isReadOnly}
        item={Object.keys(itemConfig).length > 0 ? itemConfig : undefined}
        features={
          selectionConfig && Object.keys(selectionConfig).length > 0
            ? { selection: selectionConfig }
            : undefined
        }
        services={mockServices}
      >
        <ContentListTable
          title={`${args.entityNamePlural} table`}
          compressed={args.compressed}
          tableLayout={args.tableLayout}
          renderDetails={renderDetails}
        >
          {buildColumns()}
        </ContentListTable>
        {args.showDiagnostics && <StateDiagnosticPanel defaultOpen />}
      </ContentListProvider>
    );
  },
};

// =============================================================================
// Default Story
// =============================================================================

/**
 * Minimal working example with default columns (Name, UpdatedAt, Actions).
 * No children provided - uses sensible defaults.
 */
export const Default: StoryObj = {
  render: () => {
    const onEditAction = (item: ContentListItem) => action('onEdit')(`Edit: ${item.title}`);
    const onDeleteAction = (item: ContentListItem) => action('onDelete')(`Delete: ${item.title}`);

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems: mockFindItems }}
        item={{
          getHref: (item) => `#/dashboard/${item.id}`,
          actions: {
            onEdit: onEditAction,
            onDelete: onDeleteAction,
          },
        }}
        services={mockServices}
      >
        <ContentListTable title="Dashboards" />
      </ContentListProvider>
    );
  },
};

// =============================================================================
// ReadOnly Story
// =============================================================================

/**
 * Demonstrates read-only mode where all editing and selection is disabled.
 * Useful for viewer roles or embedded contexts.
 */
export const ReadOnly: StoryObj = {
  render: () => (
    <ContentListProvider
      entityName="dashboard"
      entityNamePlural="dashboards"
      dataSource={{ findItems: mockFindItems }}
      isReadOnly
      item={{
        getHref: (item) => `#/dashboard/${item.id}`,
      }}
      services={mockServices}
    >
      <EuiCallOut title="Read-only mode" color="warning" iconType="lock" size="s">
        <p>Actions and selection are disabled. Only viewing is allowed.</p>
      </EuiCallOut>
      <EuiSpacer />
      <ContentListTable title="Dashboards (read-only)" />
    </ContentListProvider>
  ),
};

// =============================================================================
// Column Variants Story
// =============================================================================

/**
 * Demonstrates different configurations of the Name column.
 */
export const ColumnVariants: StoryObj = {
  render: () => {
    const { Column, Action } = ContentListTable;
    const onEditAction = (item: ContentListItem) => action('onEdit')(`Edit: ${item.title}`);

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems: mockFindItems }}
        item={{ actions: { onEdit: onEditAction } }}
        services={mockServices}
      >
        <EuiFlexGroup direction="column" gutterSize="xl">
          <EuiFlexItem>
            <EuiPanel>
              <EuiTitle size="xs">
                <h3>Minimal (Title Only)</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>No description, no tags, no starred.</p>
              </EuiText>
              <EuiSpacer size="m" />
              <ContentListTable title="Minimal columns">
                <Column.Name showDescription={false} showTags={false} showStarred={false} />
                <Column.UpdatedAt />
                <Column.Actions>
                  <Action.Edit />
                </Column.Actions>
              </ContentListTable>
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel>
              <EuiTitle size="xs">
                <h3>With Description</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>Title and description, no tags.</p>
              </EuiText>
              <EuiSpacer size="m" />
              <ContentListTable title="With description">
                <Column.Name showDescription showTags={false} showStarred={false} />
                <Column.UpdatedAt />
                <Column.Actions>
                  <Action.Edit />
                </Column.Actions>
              </ContentListTable>
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel>
              <EuiTitle size="xs">
                <h3>With Tags (Separate Column)</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>Tags displayed in a dedicated column instead of inline.</p>
              </EuiText>
              <EuiSpacer size="m" />
              <ContentListTable title="Tags in separate column">
                <Column.Name showDescription showTags={false} />
                <Column
                  id="tags"
                  name="Tags"
                  render={(item: ContentListItem) =>
                    item.tags && item.tags.length > 0 ? <TagList tagIds={item.tags} /> : null
                  }
                />
                <Column.UpdatedAt />
                <Column.Actions>
                  <Action.Edit />
                </Column.Actions>
              </ContentListTable>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ContentListProvider>
    );
  },
};

// =============================================================================
// Custom Columns Story
// =============================================================================

/**
 * Demonstrates creating custom columns with render functions.
 */
export const WithCustomColumns: StoryObj = {
  render: () => {
    const { Column, Action } = ContentListTable;
    const onEditAction = (item: ContentListItem) => action('onEdit')(`Edit: ${item.title}`);

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems: mockFindItems }}
        item={{ actions: { onEdit: onEditAction } }}
        services={mockServices}
      >
        <EuiPanel>
          <EuiTitle size="s">
            <h3>Custom Columns</h3>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>Custom Status and Type columns with render functions.</p>
          </EuiText>
          <EuiSpacer />
          <ContentListTable title="Custom columns example">
            <Column.Name showDescription={false} showTags={false} width="40%" />
            <Column
              id="status"
              name="Status"
              width="100px"
              render={(item: ContentListItem) => (
                <EuiBadge color={item.updatedAt ? 'success' : 'default'}>
                  {item.updatedAt ? 'Published' : 'Draft'}
                </EuiBadge>
              )}
            />
            <Column
              id="type"
              name="Type"
              width="120px"
              render={(item: ContentListItem) => (
                <EuiBadge color="hollow">{item.type || 'dashboard'}</EuiBadge>
              )}
            />
            <Column.UpdatedAt />
            <Column.Actions>
              <Action.Edit />
            </Column.Actions>
          </ContentListTable>
        </EuiPanel>
      </ContentListProvider>
    );
  },
};

// =============================================================================
// Row Actions Story
// =============================================================================

/**
 * Demonstrates all built-in actions plus custom actions.
 */
export const WithRowActions: StoryObj = {
  render: () => {
    const { Column, Action } = ContentListTable;

    const onViewDetails = (item: ContentListItem) =>
      action('onViewDetails')(`View details: ${item.title}`);
    const onEdit = (item: ContentListItem) => action('onEdit')(`Edit: ${item.title}`);
    const onDuplicate = (item: ContentListItem) =>
      action('onDuplicate')(`Duplicate: ${item.title}`);
    const onExport = (item: ContentListItem) => action('onExport')(`Export: ${item.title}`);
    const onDelete = (item: ContentListItem) => action('onDelete')(`Delete: ${item.title}`);
    const onShare = (item: ContentListItem) => action('onShare')(`Share: ${item.title}`);

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems: mockFindItems }}
        item={{
          actions: {
            onViewDetails,
            onEdit,
            onDuplicate,
            onExport,
            onDelete,
          },
        }}
        services={mockServices}
      >
        <EuiPanel>
          <EuiTitle size="s">
            <h3>All Row Actions</h3>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>All built-in actions plus a custom Share action.</p>
          </EuiText>
          <EuiSpacer />
          <ContentListTable title="Row actions example">
            <Column.Name width="50%" />
            <Column.UpdatedAt />
            <Column.Actions>
              <Action.ViewDetails />
              <Action.Edit />
              <Action.Duplicate />
              <Action
                id="share"
                label="Share"
                iconType="share"
                handler={onShare}
                tooltip="Share with team"
              />
              <Action.Export />
              <Action.Delete />
            </Column.Actions>
          </ContentListTable>
        </EuiPanel>
      </ContentListProvider>
    );
  },
};

// =============================================================================
// Selection Story
// =============================================================================

/**
 * Demonstrates row selection with bulk actions.
 */
export const WithSelection: StoryObj = {
  render: () => {
    const { Column, Action } = ContentListTable;

    const onEdit = (item: ContentListItem) => action('onEdit')(`Edit: ${item.title}`);
    const onDelete = (item: ContentListItem) => action('onDelete')(`Delete: ${item.title}`);
    const onSelectionDelete = (items: ContentListItem[]) =>
      action('onSelectionDelete')(`Bulk delete ${items.length} items`);
    const onSelectionExport = (items: ContentListItem[]) =>
      action('onSelectionExport')(`Bulk export ${items.length} items`);

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems: mockFindItems }}
        item={{
          actions: { onEdit, onDelete },
        }}
        features={{
          selection: {
            onSelectionDelete,
            onSelectionExport,
          },
        }}
        services={mockServices}
      >
        <EuiPanel>
          <EuiTitle size="s">
            <h3>Row Selection</h3>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>Select rows with checkboxes. Selection state shown in diagnostic panel.</p>
          </EuiText>
          <EuiSpacer />
          <ContentListTable title="Selection example">
            <Column.Name width="50%" />
            <Column.UpdatedAt />
            <Column.Actions>
              <Action.Edit />
              <Action.Delete />
            </Column.Actions>
          </ContentListTable>
          <StateDiagnosticPanel defaultOpen />
        </EuiPanel>
      </ContentListProvider>
    );
  },
};

// =============================================================================
// Expandable Rows Story
// =============================================================================

/**
 * Demonstrates expandable rows with both sync and async content.
 */
export const WithExpandableRows: StoryObj = {
  render: () => {
    const { Column, Action } = ContentListTable;
    const onEdit = (item: ContentListItem) => action('onEdit')(`Edit: ${item.title}`);

    // Sync render function.
    const renderDetailsSync = (item: ContentListItem) => (
      <EuiPanel color="subdued" paddingSize="m">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>ID:</strong> {item.id}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>Type:</strong> {item.type}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>Created:</strong>{' '}
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown'}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        {item.description && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              {item.description}
            </EuiText>
          </>
        )}
      </EuiPanel>
    );

    // Async render function (simulates API call).
    // Cast to RenderDetailsFunction as the hook supports async, but table props are typed as sync.
    const renderDetailsAsync: RenderDetailsFunction = (item) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(
            <EuiPanel color="subdued" paddingSize="m">
              <EuiCallOut title="Loaded asynchronously" color="success" iconType="check" size="s">
                <p>
                  Details for <strong>{item.title}</strong> were fetched from the server.
                </p>
              </EuiCallOut>
              <EuiSpacer size="s" />
              <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
                {JSON.stringify(item, null, 2)}
              </EuiCodeBlock>
            </EuiPanel>
          );
        }, 1000);
      });
    };

    return (
      <EuiFlexGroup direction="column" gutterSize="xl">
        <EuiFlexItem>
          <ContentListProvider
            entityName="dashboard"
            entityNamePlural="dashboards"
            dataSource={{ findItems: mockFindItems }}
            item={{ actions: { onEdit } }}
            queryKeyScope="sync-expandable"
            services={mockServices}
          >
            <EuiPanel>
              <EuiTitle size="s">
                <h3>Synchronous Expansion</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>Details render immediately when row is expanded.</p>
              </EuiText>
              <EuiSpacer />
              <ContentListTable title="Sync expandable rows" renderDetails={renderDetailsSync}>
                <Column.Expander />
                <Column.Name width="50%" />
                <Column.UpdatedAt />
                <Column.Actions>
                  <Action.Edit />
                </Column.Actions>
              </ContentListTable>
            </EuiPanel>
          </ContentListProvider>
        </EuiFlexItem>

        <EuiFlexItem>
          <ContentListProvider
            entityName="dashboard"
            entityNamePlural="dashboards"
            dataSource={{ findItems: mockFindItems }}
            item={{ actions: { onEdit } }}
            queryKeyScope="async-expandable"
            services={mockServices}
          >
            <EuiPanel>
              <EuiTitle size="s">
                <h3>Asynchronous Expansion</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>Details are fetched from server with loading state (1s delay).</p>
              </EuiText>
              <EuiSpacer />
              {/* Cast to any: hook supports async but table props are typed as sync-only */}
              <ContentListTable
                title="Async expandable rows"
                renderDetails={renderDetailsAsync as ContentListTableProps['renderDetails']}
              >
                <Column.Expander />
                <Column.Name width="50%" />
                <Column.UpdatedAt />
                <Column.Actions>
                  <Action.Edit />
                </Column.Actions>
              </ContentListTable>
            </EuiPanel>
          </ContentListProvider>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  },
};

// =============================================================================
// Empty States Story
// =============================================================================

/**
 * Demonstrates all three empty state variants.
 */
export const EmptyStates: StoryObj = {
  render: () => {
    const onCreate = () => action('onCreate')('Create new dashboard');

    return (
      <EuiFlexGroup direction="column" gutterSize="xl">
        <EuiFlexItem>
          <ContentListProvider
            entityName="dashboard"
            entityNamePlural="dashboards"
            dataSource={{ findItems: createMockFindItems({ isEmpty: true }) }}
            features={{ globalActions: { onCreate } }}
            queryKeyScope="empty-no-items"
            services={mockServices}
          >
            <EuiPanel>
              <EuiTitle size="s">
                <h3>No Items (First-time Use)</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>Shown when the collection is completely empty.</p>
              </EuiText>
              <EuiSpacer />
              <ContentListTable title="Empty table - no items" />
            </EuiPanel>
          </ContentListProvider>
        </EuiFlexItem>

        <EuiFlexItem>
          <ContentListProvider
            entityName="dashboard"
            entityNamePlural="dashboards"
            dataSource={{ findItems: mockFindItems }}
            queryKeyScope="empty-no-results"
            services={mockServices}
          >
            <NoResultsExample />
          </ContentListProvider>
        </EuiFlexItem>

        <EuiFlexItem>
          <ContentListProvider
            entityName="dashboard"
            entityNamePlural="dashboards"
            dataSource={{ findItems: createMockFindItems({ shouldError: true }) }}
            queryKeyScope="empty-error"
            services={mockServices}
          >
            <EuiPanel>
              <EuiTitle size="s">
                <h3>Error State</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>Shown when data fetching fails.</p>
              </EuiText>
              <EuiSpacer />
              <ContentListTable title="Empty table - error" />
            </EuiPanel>
          </ContentListProvider>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  },
};

/**
 * Helper component to demonstrate "no results" state with active search.
 */
const NoResultsExample = () => {
  const { items } = useContentListItems();
  const { setSearch } = useContentListSearch();

  // Trigger a search that returns no results.
  React.useEffect(() => {
    setSearch('xyznonexistent123');
  }, [setSearch]);

  return (
    <EuiPanel>
      <EuiTitle size="s">
        <h3>No Results (Search/Filter Applied)</h3>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>Shown when search or filters return no matches. Items exist: {items.length}</p>
      </EuiText>
      <EuiSpacer />
      <ContentListTable title="Empty table - no results" />
    </EuiPanel>
  );
};

// =============================================================================
// Loading State Story
// =============================================================================

/**
 * Demonstrates the loading state while data is being fetched.
 */
export const LoadingState: StoryObj = {
  render: () => (
    <ContentListProvider
      entityName="dashboard"
      entityNamePlural="dashboards"
      dataSource={{ findItems: createMockFindItems({ delay: 60000 }) }}
      services={mockServices}
    >
      <EuiPanel>
        <EuiTitle size="s">
          <h3>Loading State</h3>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <p>Table shows loading indicator while data is being fetched.</p>
        </EuiText>
        <EuiSpacer />
        <ContentListTable title="Loading table" />
      </EuiPanel>
    </ContentListProvider>
  ),
};
