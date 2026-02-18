/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
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
  useContentListConfig,
} from '@kbn/content-list-provider';
import type {
  ContentListItem,
  ContentListItemConfig,
  FindItemsParams,
  FindItemsResult,
} from '@kbn/content-list-provider';
import { MOCK_DASHBOARDS, createMockFindItems } from '@kbn/content-list-mock-data/storybook';
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

  return async (params: FindItemsParams): Promise<FindItemsResult> => {
    // Simulate network delay.
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Return empty for "no items" state.
    if (isEmpty) {
      return { items: [], total: 0 };
    }

    // Use mock findItems for sorting logic.
    const mockFindItems = createMockFindItems({ items });
    const result = await mockFindItems({
      searchQuery: params.searchQuery,
      filters: {},
      sort: params.sort ?? { field: 'title', direction: 'asc' },
      page: params.page,
    });

    // Transform to ContentListItem format.
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
// State Diagnostic Panel
// =============================================================================

interface StateDiagnosticPanelProps {
  /** Whether the panel is open by default. */
  defaultOpen?: boolean;
  /** Whether the description is shown. */
  showDescription?: boolean;
  /** Whether the custom type column is shown. */
  showTypeColumn?: boolean;
  /** Whether the actions column is shown. */
  showActions?: boolean;
  /** Whether custom actions (Share, Archive) are mixed in alongside presets. */
  showCustomActions?: boolean;
}

/**
 * Collapsible diagnostic panel to visualize the current provider state.
 */
const StateDiagnosticPanel = ({
  defaultOpen = false,
  showDescription = true,
  showTypeColumn = true,
  showActions = false,
  showCustomActions = false,
}: StateDiagnosticPanelProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { items, totalItems, isLoading, isFetching, error } = useContentListItems();
  const { field: sortField, direction: sortDirection } = useContentListSort();
  const { search } = useContentListSearch();
  const pagination = useContentListPagination();
  const config = useContentListConfig();

  // Generate JSX code based on current configuration.
  const tableJsx = useMemo(() => {
    const columnChildren: string[] = [];

    // Name column with optional description.
    if (showDescription) {
      columnChildren.push('  <Column.Name showDescription />');
    } else {
      columnChildren.push('  <Column.Name showDescription={false} />');
    }

    // Custom type column.
    if (showTypeColumn) {
      columnChildren.push(`  <Column
    id="type"
    name="Type"
    width="20%"
    render={(item) => <EuiBadge>{item.type}</EuiBadge>}
  />`);
    }

    // Actions column.
    if (showActions) {
      const actionLines = ['    <Action.Edit />'];

      if (showCustomActions) {
        actionLines.push(
          `    <Action id="share" name="Share" icon="share" … />`,
          `    <Action id="archive" name="Archive" icon="folderClosed" … />`
        );
      }

      actionLines.push('    <Action.Delete />');

      columnChildren.push(`  <Column.Actions>\n${actionLines.join('\n')}\n  </Column.Actions>`);
    }

    return `<ContentListTable title="…">
${columnChildren.join('\n')}
</ContentListTable>`;
  }, [showDescription, showTypeColumn, showActions, showCustomActions]);

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
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <EuiFlexGroup gutterSize="s" wrap>
              <EuiFlexItem grow={1} style={{ minWidth: 200 }}>
                <EuiTitle size="xxs">
                  <h3>Sort</h3>
                </EuiTitle>
                <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
                  {JSON.stringify({ field: sortField, direction: sortDirection }, null, 2)}
                </EuiCodeBlock>
              </EuiFlexItem>
              <EuiFlexItem grow={1} style={{ minWidth: 200 }}>
                <EuiTitle size="xxs">
                  <h3>Search</h3>
                </EuiTitle>
                <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
                  {JSON.stringify({ search, isFetching }, null, 2)}
                </EuiCodeBlock>
              </EuiFlexItem>
              {pagination.isSupported && (
                <EuiFlexItem grow={1} style={{ minWidth: 200 }}>
                  <EuiTitle size="xxs">
                    <h3>Pagination</h3>
                  </EuiTitle>
                  <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
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
              <EuiFlexItem grow={2} style={{ minWidth: 300 }}>
                <EuiTitle size="xxs">
                  <h3>Table JSX</h3>
                </EuiTitle>
                <EuiCodeBlock language="tsx" fontSize="s" paddingSize="s">
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
  entityName: string;
  entityNamePlural: string;
  hasItems: boolean;
  isLoading: boolean;
  isReadOnly: boolean;
  hasPagination: boolean;
  compressed: boolean;
  tableLayout: 'auto' | 'fixed';
  showDescription: boolean;
  showTypeColumn: boolean;
  showActions: boolean;
  showCustomActions: boolean;
  hasClickableRows: boolean;
  showDiagnostics: boolean;
}

type PlaygroundStory = StoryObj<PlaygroundArgs>;

const { Column, Action } = ContentListTable;

/**
 * Wrapper component for the Playground story.
 * Handles stable prop references via useMemo.
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

  const itemConfig = useMemo(() => {
    const config: ContentListItemConfig = {};

    if (args.hasClickableRows) {
      config.getHref = (item) => `#/${args.entityName}/${item.id}`;
    }

    if (args.showActions) {
      config.getEditUrl = (item) => `#/${args.entityName}/${item.id}/edit`;
      // NOTE: `Action.Delete` is currently a no-op stub. This handler exists so
      // `buildDeleteAction` sees `onDelete` and renders the trash icon. The toast
      // below won't fire until the Delete Orchestration PR wires the actual flow.
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

  // Key forces re-mount when configuration changes.
  const key = `${args.hasItems}-${args.isLoading}-${args.isReadOnly}-${args.hasPagination}-${args.showActions}`;

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
        }}
      >
        <ContentListTable
          title={`${args.entityNamePlural} table`}
          compressed={args.compressed}
          tableLayout={args.tableLayout}
        >
          <Column.Name showDescription={args.showDescription} />
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
            showDescription={args.showDescription}
            showTypeColumn={args.showTypeColumn}
            showActions={args.showActions}
            showCustomActions={args.showCustomActions}
          />
        )}
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
    showTypeColumn: false,
    showActions: true,
    showCustomActions: false,
    hasClickableRows: true,
    showDescription: true,
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
