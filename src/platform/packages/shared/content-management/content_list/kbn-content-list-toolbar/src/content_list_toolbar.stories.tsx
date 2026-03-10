/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
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
  EuiCallOut,
} from '@elastic/eui';
import {
  ContentListProvider,
  useContentListItems,
  useContentListSort,
  useContentListSearch,
  useContentListPagination,
  useContentListFilters,
  useContentListUserFilter,
} from '@kbn/content-list-provider';
import type {
  FindItemsParams,
  FindItemsResult,
  ContentListServices,
} from '@kbn/content-list-provider';
import {
  MOCK_DASHBOARDS,
  createMockFindItems,
  extractTagIds,
  mockTagsService,
  mockUserProfileServices,
  MOCK_USER_PROFILES_MAP,
} from '@kbn/content-list-mock-data/storybook';
import { ContentListToolbar } from './content_list_toolbar';

// =============================================================================
// Mock Data & Helpers
// =============================================================================

/**
 * Creates a mock `findItems` function with configurable behavior.
 *
 * Supports sorting, search, tag filtering, and configurable delay.
 * Note: user filtering is applied client-side by the provider, so `findItems`
 * never receives `users` in its filter params.
 */
const createStoryFindItems = (options?: { delay?: number }) => {
  const { delay = 0 } = options ?? {};

  return async (params: FindItemsParams): Promise<FindItemsResult> => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const mockFindItems = createMockFindItems({ items: MOCK_DASHBOARDS });
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
        createdBy: item.createdBy,
        managed: (item as { managed?: boolean }).managed,
      })),
      total: result.total,
      counts: result.counts,
    };
  };
};

// =============================================================================
// State Diagnostic Panel
// =============================================================================

interface StateDiagnosticPanelProps {
  /** Whether the panel is open by default. */
  defaultOpen?: boolean;
  /** Whether declarative configuration is being used. */
  useDeclarativeConfig?: boolean;
}

/**
 * Collapsible diagnostic panel to visualize the current provider state.
 */
const StateDiagnosticPanel = ({
  defaultOpen = false,
  useDeclarativeConfig = false,
}: StateDiagnosticPanelProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { items, totalItems, isLoading, isFetching } = useContentListItems();
  const { field: sortField, direction: sortDirection } = useContentListSort();
  const { search } = useContentListSearch();
  const { filters } = useContentListFilters();
  const pagination = useContentListPagination();
  const { selectedUsers, isSupported: hasCreatedBy } = useContentListUserFilter();

  const toolbarJsx = useMemo(() => {
    if (useDeclarativeConfig) {
      return `<ContentListToolbar>
  <ContentListToolbar.Filters>
    <ContentListToolbar.Filters.Tags />
    <ContentListToolbar.Filters.Sort />
    <ContentListToolbar.Filters.CreatedBy />
  </ContentListToolbar.Filters>
</ContentListToolbar>`;
    }
    return `<ContentListToolbar />`;
  }, [useDeclarativeConfig]);

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
              {isLoading && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="primary">Loading...</EuiBadge>
                </EuiFlexItem>
              )}
              {isFetching && !isLoading && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="accent">Fetching...</EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        {isOpen && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s" wrap>
              <EuiFlexItem grow={1} style={{ minWidth: 200 }}>
                <EuiTitle size="xxs">
                  <h3>Current Sort</h3>
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
              <EuiFlexItem grow={1} style={{ minWidth: 200 }}>
                <EuiTitle size="xxs">
                  <h3>Filters</h3>
                </EuiTitle>
                <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
                  {JSON.stringify(filters, null, 2)}
                </EuiCodeBlock>
              </EuiFlexItem>
              {hasCreatedBy && (
                <EuiFlexItem grow={1} style={{ minWidth: 200 }}>
                  <EuiTitle size="xxs">
                    <h3>User Filter</h3>
                  </EuiTitle>
                  <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
                    {JSON.stringify(
                      { selectedUsers: selectedUsers.length > 0 ? selectedUsers : '(none)' },
                      null,
                      2
                    )}
                  </EuiCodeBlock>
                </EuiFlexItem>
              )}
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
              <EuiFlexItem grow={1} style={{ minWidth: 200 }}>
                <EuiTitle size="xxs">
                  <h3>Toolbar JSX</h3>
                </EuiTitle>
                <EuiCodeBlock language="tsx" fontSize="s" paddingSize="s">
                  {toolbarJsx}
                </EuiCodeBlock>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiPanel>
    </>
  );
};

/**
 * Resolves a creator UID to a display name using the mock profile map.
 */
const resolveCreatorName = (createdBy?: string, managed?: boolean): string => {
  if (managed) {
    return 'Managed';
  }
  if (!createdBy) {
    return '—';
  }
  const profile = MOCK_USER_PROFILES_MAP[createdBy];
  return profile?.user.full_name ?? createdBy;
};

/**
 * Simple item list to show sorted/filtered results with creator info.
 */
const ItemList = () => {
  const { items, isLoading } = useContentListItems();

  if (isLoading) {
    return <EuiText size="s">Loading...</EuiText>;
  }

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiTitle size="xxs">
        <h3>Items ({items.length})</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {items.map((item, index) => (
        <EuiFlexGroup key={item.id} gutterSize="s" responsive={false} alignItems="baseline">
          <EuiFlexItem grow={false} style={{ minWidth: 24 }}>
            <EuiText size="s" color="subdued">
              {index + 1}.
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiText size="s">{item.title}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={item.managed ? 'accent' : 'hollow'}>
              {resolveCreatorName(item.createdBy, item.managed)}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </EuiPanel>
  );
};

// =============================================================================
// Storybook Meta
// =============================================================================

const meta: Meta = {
  title: 'Content List/Components/Toolbar',
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
  searchPlaceholder: string;
  hasSorting: boolean;
  hasPagination: boolean;
  hasTags: boolean;
  hasCreatedByFilter: boolean;
  useDeclarativeConfig: boolean;
  showDiagnostics: boolean;
}

type PlaygroundStory = StoryObj<PlaygroundArgs>;

/**
 * Wrapper component for the Playground story.
 */
const PlaygroundStoryWrapper = ({ args }: { args: PlaygroundArgs }) => {
  const labels = useMemo(
    () => ({
      entity: args.entityName,
      entityPlural: args.entityNamePlural,
      searchPlaceholder: args.searchPlaceholder,
    }),
    [args.entityName, args.entityNamePlural, args.searchPlaceholder]
  );

  const dataSource = useMemo(() => ({ findItems: createStoryFindItems() }), []);

  const features = useMemo(
    () => ({
      sorting: args.hasSorting
        ? {
            initialSort: { field: 'title', direction: 'asc' as const },
            fields: [
              { field: 'title', name: 'Name' },
              {
                field: 'updatedAt',
                name: 'Last updated',
                ascLabel: 'Old-Recent',
                descLabel: 'Recent-Old',
              },
            ],
          }
        : (false as const),
      pagination: args.hasPagination ? { initialPageSize: 10 } : (false as const),
      tags: args.hasTags,
    }),
    [args.hasSorting, args.hasPagination, args.hasTags]
  );

  const services: ContentListServices | undefined = useMemo(() => {
    const svc: ContentListServices = {};
    if (args.hasTags) {
      svc.tags = mockTagsService;
    }
    if (args.hasCreatedByFilter) {
      svc.userProfile = mockUserProfileServices;
    }
    return Object.keys(svc).length > 0 ? svc : undefined;
  }, [args.hasTags, args.hasCreatedByFilter]);

  // Key forces re-mount when configuration changes.
  const key = `${args.hasSorting}-${args.hasPagination}-${args.hasTags}-${args.hasCreatedByFilter}-${args.useDeclarativeConfig}`;

  const { Filters } = ContentListToolbar;

  return (
    <ContentListProvider
      key={key}
      id="playground"
      labels={labels}
      dataSource={dataSource}
      features={features}
      services={services}
    >
      <EuiTitle size="s">
        <h2>ContentListToolbar</h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      {args.useDeclarativeConfig ? (
        <>
          <EuiCallOut
            announceOnMount
            title="Declarative Configuration"
            color="primary"
            iconType="controlsHorizontal"
            size="s"
          >
            <p>
              Using <code>{'<Filters>'}</code> children to explicitly configure which filters appear
              and in what order.
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
          <ContentListToolbar>
            <Filters>
              <Filters.Tags />
              <Filters.Sort />
              <Filters.CreatedBy />
            </Filters>
          </ContentListToolbar>
        </>
      ) : (
        <>
          <EuiCallOut
            announceOnMount
            title="Smart Defaults"
            color="success"
            iconType="checkInCircleFilled"
            size="s"
          >
            <p>
              No children provided—toolbar auto-renders filters based on provider configuration.
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
          <ContentListToolbar />
        </>
      )}

      <EuiSpacer size="m" />
      <ItemList />
      {args.showDiagnostics && (
        <StateDiagnosticPanel defaultOpen useDeclarativeConfig={args.useDeclarativeConfig} />
      )}
    </ContentListProvider>
  );
};

/**
 * Interactive playground to explore toolbar features and configurations.
 *
 * The toolbar uses `EuiSearchBar` with integrated search and filters.
 * Use the controls panel to toggle different features and observe behavior.
 */
export const Toolbar: PlaygroundStory = {
  args: {
    useDeclarativeConfig: false,
    hasSorting: true,
    hasPagination: true,
    hasTags: true,
    hasCreatedByFilter: true,
    showDiagnostics: true,
    entityName: 'dashboard',
    entityNamePlural: 'dashboards',
    searchPlaceholder: 'Search dashboards...',
  },
  argTypes: {
    useDeclarativeConfig: {
      control: 'boolean',
      description: 'Use declarative <Filters> configuration instead of smart defaults.',
      table: { category: 'Configuration' },
    },
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
    searchPlaceholder: {
      control: 'text',
      description: 'Placeholder text for the search box.',
      table: { category: 'Labels' },
    },
    hasSorting: {
      control: 'boolean',
      description: 'Enable sorting in provider config.',
      table: { category: 'Features' },
    },
    hasPagination: {
      control: 'boolean',
      description: 'Enable pagination in provider config.',
      table: { category: 'Features' },
    },
    hasTags: {
      control: 'boolean',
      description: 'Enable tag filtering. Provides a mock tags service with 8 tags.',
      table: { category: 'Features' },
    },
    hasCreatedByFilter: {
      control: 'boolean',
      description: 'Enable "Created by" filter (provides user profile service).',
      table: { category: 'Features' },
    },
    showDiagnostics: {
      control: 'boolean',
      description: 'Show state diagnostic panel.',
      table: { category: 'Debug' },
    },
  },
  render: (args) => <PlaygroundStoryWrapper args={args} />,
};
