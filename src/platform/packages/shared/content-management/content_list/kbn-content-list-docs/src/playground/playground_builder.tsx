/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useReducer } from 'react';
import type { DropResult } from '@hello-pangea/dnd';
import type { EuiTabbedContentTab } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiDragDropContext,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  euiDragDropReorder,
} from '@elastic/eui';
import {
  ContentList,
  ContentListProvider,
  ContentListEmptyState,
  ContentListTable,
  ContentListToolbar,
  ContentListFooter,
  type ContentListItem,
} from '@kbn/content-list';

import {
  buildMockItems,
  createMockFavoritesClient,
  createStoryFindItems,
  createMockTagFacetProvider,
  createMockUserProfileFacetProvider,
  mockTagsService,
  mockContentListUserProfilesServices,
  toJsx,
  useInspectFlyout,
} from '../stories_helpers';
import { BuilderPanel } from './builder_panel';
import type { PlaygroundState } from './playground_state';
import { INITIAL_STATE, playgroundReducer } from './playground_state';
import INSTRUCTIONS_MD from './instructions.md?raw';

// =============================================================================
// Styles
// =============================================================================

const layoutCss = css({ minHeight: 600 });

const panelCss = css({ height: '100%', overflow: 'auto' });

// =============================================================================
// Sort field mapping
// =============================================================================

interface SortFieldDef {
  field: string;
  name: string;
  ascLabel?: string;
  descLabel?: string;
}

/**
 * Build the sort fields array from the current column configuration.
 * Each sortable column type contributes a sort field definition.
 */
const buildSortFields = (columns: PlaygroundState['table']['columns']): SortFieldDef[] => {
  const fields: SortFieldDef[] = [];

  for (const col of columns) {
    switch (col.type) {
      case 'name':
        fields.push({ field: 'title', name: 'Name' });
        break;
      case 'updatedAt':
        fields.push({
          field: 'updatedAt',
          name: 'Last updated',
          ascLabel: 'Old-Recent',
          descLabel: 'Recent-Old',
        });
        break;
      default:
        break;
    }
  }

  return fields;
};

// =============================================================================
// Preview hook
// =============================================================================

const { Column, Action } = ContentListTable;
const { Filters } = ContentListToolbar;

/**
 * Derive all preview values from the current playground state.
 *
 * Returns a flat set of values consumed by the `PlaygroundBuilder`:
 * - `providerProps` — spread onto `ContentListProvider`.
 * - `toolbarElement` / `columns` — the live child elements.
 * - `consumerJsx` — a lightweight element tree (without EUI layout wrappers)
 *   used solely for JSX serialization via {@link toJsx}.
 */
const usePreview = (state: PlaygroundState, onInspect?: (item: ContentListItem) => void) => {
  const { provider, features, item: itemConfig, table, toolbar, data } = state;

  const labels = useMemo(
    () => ({ entity: provider.entity, entityPlural: provider.entityPlural }),
    [provider.entity, provider.entityPlural]
  );

  const sortFields = useMemo(() => buildSortFields(state.table.columns), [state.table.columns]);

  // Feature toggles are master switches: the service and provider feature
  // are only enabled when the toggle is on. Columns and filters for a
  // disabled feature render silently empty.
  const hasTags = features.tags;
  const hasStarred = features.starred;
  const hasUserProfiles = features.userProfiles;

  // Memoized before `dataSource` so both the provider and findItems share the same
  // in-memory favorites set — starring an item is immediately reflected when the
  // `starred` filter is toggled.
  const favoritesClient = useMemo(
    () => (hasStarred ? createMockFavoritesClient() : undefined),
    [hasStarred]
  );

  const mockItems = useMemo(() => buildMockItems(data.totalItems), [data.totalItems]);

  const dataSource = useMemo(() => {
    const baseOptions = {
      totalItems: data.totalItems,
      isEmpty: !data.hasItems,
      favoritesClient,
    };
    if (data.isLoading) {
      return {
        findItems: createStoryFindItems({ ...baseOptions, delay: 800 }),
      };
    }
    return {
      findItems: createStoryFindItems(baseOptions),
    };
  }, [data.totalItems, data.isLoading, data.hasItems, favoritesClient]);

  const providerFeatures = useMemo(
    () => ({
      sorting: features.sorting
        ? { initialSort: { field: 'title', direction: 'asc' as const }, fields: sortFields }
        : (false as const),
      pagination: features.pagination
        ? { initialPageSize: features.initialPageSize }
        : (false as const),
      search: features.search ? {} : (false as const),
      tags: hasTags ? createMockTagFacetProvider(mockItems) : (false as const),
      starred: hasStarred ? true : (false as const),
      userProfiles: hasUserProfiles
        ? createMockUserProfileFacetProvider(mockItems)
        : (false as const),
    }),
    [
      features.sorting,
      features.pagination,
      features.initialPageSize,
      features.search,
      sortFields,
      hasTags,
      hasStarred,
      hasUserProfiles,
      mockItems,
    ]
  );

  const providerItemConfig = useMemo(() => {
    const config: Record<string, unknown> = {};
    if (itemConfig.getHref) {
      config.getHref = (i: ContentListItem) => `#/${provider.entity}/${i.id}`;
    }
    if (itemConfig.getEditUrl) {
      config.getEditUrl = (i: ContentListItem) => `#/${provider.entity}/${i.id}/edit`;
    }
    if (itemConfig.onEdit) {
      config.onEdit = (i: ContentListItem) => alert(`Edit: ${i.title}`);
    }
    if (itemConfig.onDelete) {
      config.onDelete = async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
      };
    }
    if (itemConfig.onInspect && onInspect) {
      config.onInspect = onInspect;
    }
    return Object.keys(config).length > 0 ? config : undefined;
  }, [itemConfig, provider.entity, onInspect]);

  const columns = useMemo(
    () =>
      table.columns.map((col) => {
        const cleanProps = Object.fromEntries(
          Object.entries(col.props).filter(([, v]) => v !== '' && v !== undefined)
        );

        switch (col.type) {
          case 'starred':
            return <Column.Starred key={col.instanceId} {...cleanProps} />;
          case 'name':
            return <Column.Name key={col.instanceId} {...cleanProps} />;
          case 'updatedAt':
            return <Column.UpdatedAt key={col.instanceId} {...cleanProps} />;
          case 'createdBy':
            return <Column.CreatedBy key={col.instanceId} {...cleanProps} />;
          case 'type': {
            const { columnTitle, ...rest } = cleanProps;
            return (
              <Column
                key={col.instanceId}
                id="type"
                name={(columnTitle as string) || 'Type'}
                {...rest}
                render={(item: ContentListItem) => (
                  <EuiBadge color="hollow">{item.type ?? 'unknown'}</EuiBadge>
                )}
              />
            );
          }
          case 'actions':
            return (
              <Column.Actions key={col.instanceId} {...cleanProps}>
                {col.actions.map((act) => {
                  switch (act.type) {
                    case 'edit':
                      return <Action.Edit key={act.instanceId} />;
                    case 'inspect':
                      return <Action.Inspect key={act.instanceId} />;
                    case 'delete':
                      return <Action.Delete key={act.instanceId} />;
                    case 'export':
                      return (
                        <Action
                          key={act.instanceId}
                          id="export"
                          name="Export"
                          icon="exportAction"
                          onClick={(item) => alert(`Export: ${item.title}`)}
                        />
                      );
                    default:
                      return null;
                  }
                })}
              </Column.Actions>
            );
          default:
            return null;
        }
      }),
    [table.columns]
  );

  const toolbarElement = useMemo(() => {
    // Always render explicit Filters children so the toolbar shows exactly what
    // the user has configured. Falling back to framework defaults would include
    // the starred filter whenever supports.starred is true, even if the user
    // hasn't added Filters.Starred.
    const filterParts =
      toolbar.filters.length > 0
        ? toolbar.filters.map((f) => {
            switch (f.type) {
              case 'starred':
                return <Filters.Starred key={f.instanceId} />;
              case 'sort':
                return <Filters.Sort key={f.instanceId} />;
              case 'tags':
                return <Filters.Tags key={f.instanceId} />;
              case 'createdBy':
                return <Filters.CreatedBy key={f.instanceId} />;
              default:
                return null;
            }
          })
        : [<Filters.Sort key="sort" />];

    return (
      <ContentListToolbar>
        <Filters>{filterParts}</Filters>
      </ContentListToolbar>
    );
  }, [toolbar.filters]);

  const tableTitle = `${provider.entityPlural} table`;

  const services = useMemo(() => {
    const s: Record<string, unknown> = {};
    if (hasTags) {
      s.tags = mockTagsService;
    }
    if (hasStarred && favoritesClient) {
      s.favorites = favoritesClient;
    }
    if (hasUserProfiles) {
      s.userProfiles = mockContentListUserProfilesServices;
    }
    return Object.keys(s).length > 0 ? s : undefined;
  }, [hasTags, hasStarred, favoritesClient, hasUserProfiles]);

  // Isolate the React Query cache per data variant. The QueryClient is a
  // module-level singleton shared across every provider remount in the
  // playground, so without this the cache from a previous variant (e.g. items
  // from a non-empty state) is briefly shown when toggling `Empty`, causing a
  // flash of the old table before the new fetch resolves.
  const queryKeyScope = useMemo(
    () =>
      `playground-${data.hasItems ? '1' : '0'}-${data.totalItems}-${data.isLoading ? '1' : '0'}`,
    [data.hasItems, data.totalItems, data.isLoading]
  );

  const providerProps = useMemo(
    () => ({
      labels,
      dataSource,
      features: providerFeatures,
      isReadOnly: provider.isReadOnly,
      item: providerItemConfig,
      queryKeyScope,
      ...(services && { services }),
    }),
    [
      labels,
      dataSource,
      providerFeatures,
      provider.isReadOnly,
      providerItemConfig,
      queryKeyScope,
      services,
    ]
  );

  const consumerJsx = useMemo(
    () => (
      <ContentListProvider id="playground" {...providerProps}>
        <ContentList emptyState={<ContentListEmptyState />}>
          {toolbarElement}
          <ContentListTable title={tableTitle}>{columns}</ContentListTable>
          <ContentListFooter />
        </ContentList>
      </ContentListProvider>
    ),
    [providerProps, toolbarElement, tableTitle, columns]
  );

  return { providerProps, toolbarElement, columns, tableTitle, consumerJsx };
};

// =============================================================================
// PlaygroundBuilder
// =============================================================================

/**
 * Interactive visual builder for the Content List playground.
 *
 * Renders a side-by-side layout with a JSX-tree-shaped builder (left) and a
 * live preview with generated JSX output (right). Columns and toolbar filters
 * can be reordered via drag-and-drop and added from a component palette.
 */
export const PlaygroundBuilder = () => {
  const [state, dispatch] = useReducer(playgroundReducer, INITIAL_STATE);
  const { onInspect, flyout } = useInspectFlyout();
  const { providerProps, toolbarElement, columns, tableTitle, consumerJsx } = usePreview(
    state,
    onInspect
  );

  const stateKey = JSON.stringify(state);
  const actionsCol = state.table.columns.find((c) => c.type === 'actions');

  const handleDragEnd = useCallback(
    ({ source, destination }: DropResult) => {
      if (!destination) {
        return;
      }
      if (source.droppableId === destination.droppableId && source.index === destination.index) {
        return;
      }

      if (source.droppableId === 'columns') {
        const reordered = euiDragDropReorder(state.table.columns, source.index, destination.index);
        dispatch({ type: 'REORDER_COLUMNS', columns: reordered });
      } else if (source.droppableId === 'filters') {
        const reordered = euiDragDropReorder(
          state.toolbar.filters,
          source.index,
          destination.index
        );
        dispatch({ type: 'REORDER_FILTERS', filters: reordered });
      } else if (source.droppableId === 'actions' && actionsCol) {
        const reordered = euiDragDropReorder(actionsCol.actions, source.index, destination.index);
        dispatch({ type: 'REORDER_ACTIONS', actions: reordered });
      }
    },
    [state.table.columns, state.toolbar.filters, actionsCol]
  );

  const jsx = useMemo(() => toJsx(consumerJsx), [consumerJsx]);

  const tabs = useMemo<EuiTabbedContentTab[]>(
    () => [
      {
        id: 'about',
        name: 'About',
        content: (
          <>
            <EuiSpacer size="m" />
            <EuiMarkdownFormat textSize="s">{INSTRUCTIONS_MD}</EuiMarkdownFormat>
          </>
        ),
      },
      {
        id: 'preview',
        name: 'Preview',
        content: (
          <>
            <EuiSpacer size="m" />
            <ContentListProvider key={stateKey} id="playground" {...providerProps}>
              <ContentList emptyState={<ContentListEmptyState />}>
                {toolbarElement}
                <ContentListTable title={tableTitle}>{columns}</ContentListTable>
                <ContentListFooter />
              </ContentList>
            </ContentListProvider>
            {flyout}
            <EuiSpacer size="l" />
            <EuiCodeBlock language="tsx" fontSize="s" paddingSize="s" overflowHeight={300}>
              {jsx}
            </EuiCodeBlock>
          </>
        ),
      },
    ],
    [stateKey, providerProps, toolbarElement, tableTitle, columns, jsx, flyout]
  );

  return (
    <EuiDragDropContext onDragEnd={handleDragEnd}>
      <EuiFlexGroup gutterSize="l" responsive={false} css={layoutCss}>
        {/* ── Builder (left) ──────────────────────────────────────── */}
        <EuiFlexItem grow={4}>
          <EuiPanel paddingSize="m" hasBorder css={panelCss}>
            <BuilderPanel {...{ state, dispatch }} />
          </EuiPanel>
        </EuiFlexItem>

        {/* ── Preview & About (right) ───────────────────────── */}
        <EuiFlexItem grow={6}>
          <EuiPanel paddingSize="m" hasBorder css={panelCss}>
            <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiDragDropContext>
  );
};
