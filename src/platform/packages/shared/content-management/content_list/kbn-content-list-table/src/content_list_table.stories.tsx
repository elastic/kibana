/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import reactElementToJSXString from 'react-element-to-jsx-string';
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
  EuiGlobalToastList,
} from '@elastic/eui';
import type { EuiGlobalToastListToast as Toast } from '@elastic/eui';
import {
  ContentListProvider,
  useContentListItems,
  useContentListSort,
  useContentListSearch,
  useContentListPagination,
  useContentListFilters,
  useContentListConfig,
  useContentListSelection,
} from '@kbn/content-list-provider';
import type {
  ContentListItem,
  ContentListItemConfig,
  ContentListServices,
  FindItemsParams,
  FindItemsResult,
} from '@kbn/content-list-provider';
import { ContentListToolbar } from '@kbn/content-list-toolbar';
import {
  MOCK_DASHBOARDS,
  createMockFindItems,
  extractTagIds,
  mockTagsService,
} from '@kbn/content-list-mock-data/storybook';
import { ContentListTable } from './content_list_table';

// =============================================================================
// Mock Data & Helpers
// =============================================================================

/**
 * Creates a mock `findItems` function with configurable behavior.
 *
 * Supports:
 * - Sorting (locale-aware for strings).
 * - Configurable delay for loading states.
 * - Empty state simulation.
 */
const createStoryFindItems = (options?: {
  items?: typeof MOCK_DASHBOARDS;
  delay?: number;
  isEmpty?: boolean;
}) => {
  const { items = MOCK_DASHBOARDS, delay = 0, isEmpty = false } = options ?? {};

  const availableItems = items;

  return async (params: FindItemsParams): Promise<FindItemsResult> => {
    // Simulate network delay.
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Return empty for "no items" state.
    if (isEmpty) {
      return { items: [], total: 0 };
    }

    const mockFindItems = createMockFindItems({ items: availableItems });
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
};

// =============================================================================
// JSX Serialization
// =============================================================================

// NOTE: `formatComponentName`, `toJsx`, and `StateDiagnosticPanel` are
// duplicated from `@kbn/content-list-docs/stories_helpers`. The docs package
// depends on this table package, so importing back would create a circular
// reference. If a shared storybook-helpers package is introduced, consolidate
// these copies there.

/**
 * Part suffixes whose export names follow the `{Preset}{Part}` pattern
 * (e.g. `NameColumn`, `EditAction`). Used as a fallback when the assembly
 * `displayName` is unavailable at runtime.
 */
const PART_SUFFIXES = ['Column', 'Action'];

/**
 * Map assembly-generated `displayName` values to consumer-facing names.
 *
 * @see [`factory.ts`](../../../kbn-content-list-assembly/src/factory.ts) for the
 * `generateDisplayName` function that produces assembly-style names.
 */
const formatComponentName = (element: React.ReactNode): string => {
  const type = (element as ReactElement | undefined)?.type as unknown as
    | { displayName?: string; name?: string }
    | undefined;
  const rawName: string = type?.displayName ?? type?.name ?? 'Unknown';

  // Assembly names follow "Assembly.part[.preset]".
  const segments = rawName.split('.');
  if (segments.length >= 2) {
    return segments
      .slice(1)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join('.');
  }

  // Fallback: handle export names like `NameColumn` → `Column.Name`.
  for (const suffix of PART_SUFFIXES) {
    if (rawName.endsWith(suffix) && rawName !== suffix) {
      return `${suffix}.${rawName.slice(0, -suffix.length)}`;
    }
  }

  // Strip trailing `Component` from wrapper names.
  if (rawName.endsWith('Component') && rawName !== 'Component') {
    return rawName.slice(0, -'Component'.length);
  }

  return rawName;
};

/** Convert a React element to a formatted JSX string. */
const toJsx = (element: ReactElement): string =>
  reactElementToJSXString(element, {
    displayName: formatComponentName,
    showFunctions: true,
    functionValue: (fn) => (fn.name ? `${fn.name}()` : '…'),
    showDefaultProps: false,
    sortProps: false,
    useBooleanShorthandSyntax: true,
    useFragmentShortSyntax: true,
    filterProps: ['key'],
  });

// =============================================================================
// State Diagnostic Panel
// =============================================================================

interface StateDiagnosticPanelProps {
  /** Whether the panel is open by default. */
  defaultOpen?: boolean;
  /** React element to serialize and display as JSX source code. */
  element: ReactElement;
  /** Whether selection is enabled. */
  showSelection?: boolean;
}

/**
 * Collapsible diagnostic panel to visualize the current provider state.
 */
const StateDiagnosticPanel = ({
  defaultOpen = false,
  element,
  showSelection = false,
}: StateDiagnosticPanelProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { items, totalItems, isLoading, isFetching, error } = useContentListItems();
  const { field: sortField, direction: sortDirection } = useContentListSort();
  const { search } = useContentListSearch();
  const { filters } = useContentListFilters();
  const pagination = useContentListPagination();
  const { selectedIds, selectedCount } = useContentListSelection();
  const config = useContentListConfig();
  const tableJsx = useMemo(() => toJsx(element), [element]);

  return (
    <>
      <EuiSpacer size="l" />
      <EuiPanel color="plain" hasBorder={false} hasShadow={false} paddingSize={isOpen ? 'm' : 's'}>
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
              <h2>State Diagnostic Panel</h2>
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
                  <EuiBadge color="accent">{selectedCount} selected</EuiBadge>
                </EuiFlexItem>
              )}
              {isLoading && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="primary">Loading…</EuiBadge>
                </EuiFlexItem>
              )}
              {isFetching && !isLoading && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="accent">Fetching…</EuiBadge>
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
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>Selection:</strong>{' '}
                  {config.supports.selection ? (
                    <EuiBadge color="success">Enabled</EuiBadge>
                  ) : (
                    <EuiBadge color="hollow">Disabled</EuiBadge>
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <EuiFlexGroup gutterSize="s" wrap>
              <EuiFlexItem grow={1} style={{ minWidth: 200 }}>
                <EuiTitle size="xxs">
                  <h3>Sort</h3>
                </EuiTitle>
                <EuiCodeBlock language="json" fontSize="s" paddingSize="s" transparentBackground>
                  {JSON.stringify({ field: sortField, direction: sortDirection }, null, 2)}
                </EuiCodeBlock>
              </EuiFlexItem>
              <EuiFlexItem grow={1} style={{ minWidth: 200 }}>
                <EuiTitle size="xxs">
                  <h3>Search</h3>
                </EuiTitle>
                <EuiCodeBlock language="json" fontSize="s" paddingSize="s" transparentBackground>
                  {JSON.stringify({ search, isFetching }, null, 2)}
                </EuiCodeBlock>
              </EuiFlexItem>
              <EuiFlexItem grow={1} style={{ minWidth: 200 }}>
                <EuiTitle size="xxs">
                  <h3>Filters</h3>
                </EuiTitle>
                <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
                  {JSON.stringify(filters, null, 2)}
                </EuiCodeBlock>
              </EuiFlexItem>
              {pagination.isSupported && (
                <EuiFlexItem grow={1} style={{ minWidth: 200 }}>
                  <EuiTitle size="xxs">
                    <h3>Pagination</h3>
                  </EuiTitle>
                  <EuiCodeBlock language="json" fontSize="s" paddingSize="s" transparentBackground>
                    {JSON.stringify(
                      {
                        pageIndex: pagination.pageIndex,
                        pageSize: pagination.pageSize,
                        totalItems,
                      },
                      null,
                      2
                    )}
                  </EuiCodeBlock>
                </EuiFlexItem>
              )}
              {showSelection && (
                <EuiFlexItem grow={1} style={{ minWidth: 200 }}>
                  <EuiTitle size="xxs">
                    <h3>Selection</h3>
                  </EuiTitle>
                  <EuiCodeBlock language="json" fontSize="s" paddingSize="s" transparentBackground>
                    {JSON.stringify(
                      { selectedCount, selectedIds: selectedIds.slice(0, 5) },
                      null,
                      2
                    )}
                  </EuiCodeBlock>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={2} style={{ minWidth: 300 }}>
                <EuiTitle size="xxs">
                  <h3>Table JSX</h3>
                </EuiTitle>
                <EuiCodeBlock language="tsx" fontSize="s" paddingSize="s" transparentBackground>
                  {tableJsx}
                </EuiCodeBlock>
              </EuiFlexItem>
            </EuiFlexGroup>

            {error && (
              <>
                <EuiSpacer size="m" />
                <EuiTitle size="xxs">
                  <h3>Error</h3>
                </EuiTitle>
                <EuiCodeBlock language="text" fontSize="s" paddingSize="s">
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
  title: 'Content List/Components/Table',
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
  entityName: string;
  entityNamePlural: string;
  hasItems: boolean;
  isLoading: boolean;
  isReadOnly: boolean;
  hasPagination: boolean;
  hasTags: boolean;
  compressed: boolean;
  tableLayout: 'auto' | 'fixed';
  showDescription: boolean;
  showTags: boolean;
  showTypeColumn: boolean;
  showActions: boolean;
  showCustomActions: boolean;
  showSelection: boolean;
  hasClickableRows: boolean;
  showDiagnostics: boolean;
}

type PlaygroundStory = StoryObj<PlaygroundArgs>;

const { Column, Action } = ContentListTable;

/**
 * Wrapper component for the Playground story.
 * Handles stable prop references via `useMemo`.
 */
const PlaygroundStoryWrapper = ({ args }: { args: PlaygroundArgs }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdCounter = useRef(0);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    toastIdCounter.current += 1;
    setToasts((prev) => [...prev, { ...toast, id: String(toastIdCounter.current) }]);
  }, []);

  const removeToast = useCallback((toast: Toast) => {
    setToasts((prev) => prev.filter((t) => t.id !== toast.id));
  }, []);

  const labels = useMemo(
    () => ({ entity: args.entityName, entityPlural: args.entityNamePlural }),
    [args.entityName, args.entityNamePlural]
  );

  const dataSource = useMemo(() => {
    const findItems = createStoryFindItems({
      delay: args.isLoading ? 10000 : 0,
      isEmpty: !args.hasItems,
    });
    return { findItems };
  }, [args.isLoading, args.hasItems]);

  // Use a ref to keep `getHref` stable while still logging to the actions panel.
  const entityNameRef = useRef(args.entityName);
  entityNameRef.current = args.entityName;

  const itemConfig = useMemo(() => {
    const config: ContentListItemConfig = {};

    if (args.hasClickableRows) {
      config.getHref = (item) => `#/${args.entityName}/${item.id}`;
    }

    if (args.showActions) {
      config.getEditUrl = (item) => `#/${args.entityName}/${item.id}/edit`;
      config.onDelete = async (items) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const names = items.map((item) => item.title).join(', ');
        addToast({
          title: `Deleted ${items.length} ${
            items.length === 1 ? args.entityName : args.entityNamePlural
          }`,
          text: names,
          color: 'success',
        });
      };
    }

    return Object.keys(config).length > 0 ? config : undefined;
  }, [args.hasClickableRows, args.showActions, args.entityName, args.entityNamePlural, addToast]);

  const handleShare = useCallback(
    (item: ContentListItem) => {
      addToast({ title: `Shared "${item.title}"`, color: 'primary' });
    },
    [addToast]
  );

  const handleArchive = useCallback(
    (item: ContentListItem) => {
      addToast({ title: `Archived "${item.title}"`, color: 'warning' });
    },
    [addToast]
  );

  // Build a display element representing the consumer-facing JSX.
  // `toJsx()` (inside `StateDiagnosticPanel`) serializes it automatically.
  const displayElement = useMemo(
    () => (
      <ContentListTable
        title={`${args.entityNamePlural} table`}
        compressed={args.compressed}
        tableLayout={args.tableLayout}
      >
        <Column.Name showDescription={args.showDescription} showTags={args.showTags} />
        <Column.UpdatedAt />
        {args.showTypeColumn && (
          <Column
            id="type"
            name="Type"
            width="20%"
            render={(item) => <EuiBadge color="hollow">{item.type ?? 'unknown'}</EuiBadge>}
          />
        )}
        {args.showActions && (
          <Column.Actions>
            <Action.Edit />
            {args.showCustomActions && (
              <>
                <Action
                  id="share"
                  name="Share"
                  description="Share with team"
                  icon="share"
                  type="icon"
                  onClick={handleShare}
                />
                <Action
                  id="archive"
                  name="Archive"
                  description="Move to archive"
                  icon="folderClosed"
                  type="icon"
                  onClick={handleArchive}
                />
              </>
            )}
            <Action.Delete />
          </Column.Actions>
        )}
      </ContentListTable>
    ),
    [
      args.entityNamePlural,
      args.compressed,
      args.tableLayout,
      args.showDescription,
      args.showTags,
      args.showTypeColumn,
      args.showActions,
      args.showCustomActions,
      handleShare,
      handleArchive,
    ]
  );

  const services: ContentListServices | undefined = useMemo(
    () => (args.hasTags ? { tags: mockTagsService } : undefined),
    [args.hasTags]
  );

  // Key forces re-mount when configuration changes.
  const key = `${args.hasItems}-${args.isLoading}-${args.isReadOnly}-${args.hasPagination}-${args.hasTags}-${args.showActions}-${args.showSelection}`;

  return (
    <>
      <ContentListProvider
        key={key}
        id="playground"
        labels={labels}
        dataSource={dataSource}
        isReadOnly={args.isReadOnly}
        item={itemConfig}
        features={{
          sorting: {
            initialSort: { field: 'title', direction: 'asc' },
          },
          pagination: args.hasPagination ? { initialPageSize: 10 } : (false as const),
          selection: args.showSelection,
          tags: args.hasTags,
        }}
        services={services}
      >
        <EuiPanel paddingSize="xl">
          <ContentListToolbar />
          <EuiSpacer size="m" />
          <ContentListTable
            title={`${args.entityNamePlural} table`}
            compressed={args.compressed}
            tableLayout={args.tableLayout}
          >
            <Column.Name showDescription={args.showDescription} showTags={args.showTags} />
            <Column.UpdatedAt />
            {args.showTypeColumn && (
              <Column
                id="type"
                name="Type"
                width="20%"
                render={(item) => <EuiBadge color="hollow">{item.type ?? 'unknown'}</EuiBadge>}
              />
            )}
            {args.showActions && (
              <Column.Actions>
                <Action.Edit />
                {args.showCustomActions && (
                  <>
                    <Action
                      id="share"
                      name="Share"
                      description="Share with team"
                      icon="share"
                      type="icon"
                      onClick={handleShare}
                    />
                    <Action
                      id="archive"
                      name="Archive"
                      description="Move to archive"
                      icon="folderClosed"
                      type="icon"
                      onClick={handleArchive}
                    />
                  </>
                )}
                <Action.Delete />
              </Column.Actions>
            )}
          </ContentListTable>
          {args.showDiagnostics && (
            <StateDiagnosticPanel
              defaultOpen
              element={displayElement}
              showSelection={args.showSelection}
            />
          )}
        </EuiPanel>
      </ContentListProvider>
      <EuiGlobalToastList toasts={toasts} dismissToast={removeToast} toastLifeTimeMs={3000} />
    </>
  );
};

/**
 * Interactive playground to explore table features and configurations.
 * Use the controls panel to toggle different features and observe behavior.
 */
export const Table: PlaygroundStory = {
  args: {
    hasItems: true,
    isLoading: false,
    isReadOnly: false,
    hasPagination: true,
    hasTags: true,
    showTypeColumn: false,
    showActions: true,
    showCustomActions: false,
    showSelection: true,
    hasClickableRows: true,
    showDescription: true,
    showTags: true,
    entityName: 'dashboard',
    entityNamePlural: 'dashboards',
    compressed: false,
    tableLayout: 'auto',
    showDiagnostics: true,
  },
  argTypes: {
    entityName: {
      control: 'text',
      description: 'Singular entity name for display.',
      table: { category: 'Entity' },
    },
    entityNamePlural: {
      control: 'text',
      description: 'Plural entity name for display.',
      table: { category: 'Entity' },
    },
    hasItems: {
      control: 'boolean',
      description: 'Whether data exists (false shows empty state).',
      table: { category: 'State' },
    },
    isLoading: {
      control: 'boolean',
      description: 'Show loading state.',
      table: { category: 'State' },
    },
    isReadOnly: {
      control: 'boolean',
      description: 'Disable all editing and selection.',
      table: { category: 'State' },
    },
    hasPagination: {
      control: 'boolean',
      description: 'Enable pagination in provider config.',
      table: { category: 'Features' },
    },
    hasTags: {
      control: 'boolean',
      description: 'Enable tag filtering. Provides a mock tags service.',
      table: { category: 'Features' },
    },
    compressed: {
      control: 'boolean',
      description: 'Use compact table style.',
      table: { category: 'Appearance' },
    },
    tableLayout: {
      control: 'radio',
      options: ['auto', 'fixed'],
      description: 'Table column sizing strategy.',
      table: { category: 'Appearance' },
    },
    showDescription: {
      control: 'boolean',
      description: 'Show description in Name column.',
      table: { category: 'Columns' },
    },
    showTags: {
      control: 'boolean',
      description: 'Show tag badges in Name column. Clicking a tag toggles a filter.',
      table: { category: 'Columns' },
      if: { arg: 'hasTags' },
    },
    showTypeColumn: {
      control: 'boolean',
      description: 'Add a custom "Type" column to demonstrate custom columns.',
      table: { category: 'Columns' },
    },
    showActions: {
      control: 'boolean',
      description: 'Add Edit and Delete row actions column.',
      table: { category: 'Actions' },
    },
    showCustomActions: {
      control: 'boolean',
      description:
        'Mix in custom Share and Archive actions alongside the built-in presets, demonstrating custom `Action` components.',
      table: { category: 'Actions' },
      if: { arg: 'showActions' },
    },
    showSelection: {
      control: 'boolean',
      description:
        'Enable row selection with checkboxes. Shows a delete button in the toolbar that clears the selection when clicked.',
      table: { category: 'Selection' },
    },
    hasClickableRows: {
      control: 'boolean',
      description: 'Make row titles clickable links.',
      table: { category: 'Rows' },
    },
    showDiagnostics: {
      control: 'boolean',
      description: 'Show state diagnostic panel.',
      table: { category: 'Debug' },
    },
  },
  render: (args) => <PlaygroundStoryWrapper args={args} />,
};
