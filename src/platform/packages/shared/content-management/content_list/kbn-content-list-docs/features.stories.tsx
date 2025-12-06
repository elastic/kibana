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
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle, EuiText } from '@elastic/eui';
import { ContentListToolbar } from '@kbn/content-list-toolbar';
import { ContentListTable } from '@kbn/content-list-table';
import { ContentListProvider, type ContentListItem } from '@kbn/content-list-provider';
import {
  createSimpleMockFindItems,
  createMockServices,
  MOCK_TAGS,
} from '@kbn/content-list-mock-data';

/** Basic services - no filter services enabled. */
const basicServices = createMockServices();

/** Services with favorites for starring demo. */
const favoritesServices = createMockServices({
  favorites: true,
});

/** Services with tags, user profiles, and favorites for filtering demo. */
const filteringServices = createMockServices({
  tags: true,
  tagList: MOCK_TAGS,
  userProfiles: true,
  favorites: true,
});

const meta: Meta = {
  title: 'Content Management/Content List/Features',
  decorators: [
    (Story) => (
      <div style={{ padding: '20px', maxWidth: '1400px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

/**
 * ## Search
 *
 * Enable text search with the `features.search` configuration.
 *
 * Options:
 * - `placeholder`: Custom placeholder text for the search input
 * - `debounceMs`: Debounce delay in milliseconds (default: 300)
 *
 * The search queries the `findItems` function with a `searchQuery` parameter.
 */
export const Search: StoryObj = {
  render: () => {
    const onClick = (item: ContentListItem) => action('click')(item.title);
    const findItems = createSimpleMockFindItems();

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems }}
        services={basicServices}
        item={{ actions: { onClick } }}
        features={{
          search: { placeholder: 'Search dashboards by name or description...' },
        }}
      >
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>Search</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>Type in the search box to filter items by title or description.</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListToolbar />
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListTable title="Searchable dashboards" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </ContentListProvider>
    );
  },
};

/**
 * ## Filtering
 *
 * Enable filter dropdowns with the `features.filtering` configuration.
 *
 * Set `filtering: true` to enable all available filters, or configure individually:
 * - `tags`: Tag filter (include/exclude)
 * - `users`: Created by filter
 * - `custom`: Custom filter fields (see Customization stories)
 *
 * Also enable `features.starred` for the starred/favorites toggle.
 */
export const Filtering: StoryObj = {
  render: () => {
    const onClick = (item: ContentListItem) => action('click')(item.title);
    const findItems = createSimpleMockFindItems();

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems }}
        services={filteringServices}
        item={{ actions: { onClick } }}
        features={{
          search: { placeholder: 'Search dashboards...' },
          filtering: {
            tags: true,
            users: true,
            starred: true,
          },
          starred: true,
          tags: true,
          userProfiles: true,
        }}
      >
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>Filtering</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>
                  Use the filter dropdowns to narrow results by tags, creator, or starred status.
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListToolbar />
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListTable title="Filterable dashboards" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </ContentListProvider>
    );
  },
};

/**
 * ## Sorting
 *
 * Enable sorting with the `features.sorting` configuration.
 *
 * Options:
 * - `fields`: Array of sortable fields with labels
 * - `initialSort`: Default sort field and direction
 *
 * Default fields: `title`, `updatedAt`, `createdAt`
 */
export const Sorting: StoryObj = {
  render: () => {
    const onClick = (item: ContentListItem) => action('click')(item.title);
    const findItems = createSimpleMockFindItems();

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems }}
        services={basicServices}
        item={{ actions: { onClick } }}
        features={{
          search: { placeholder: 'Search dashboards...' },
          sorting: {
            initialSort: { field: 'updatedAt', direction: 'desc' },
          },
        }}
      >
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>Sorting</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>Use the Sort dropdown to change the sort field and direction.</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListToolbar />
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListTable title="Sortable dashboards" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </ContentListProvider>
    );
  },
};

/**
 * ## Selection & Bulk Actions
 *
 * Enable row selection with the `features.selection` configuration.
 *
 * Options:
 * - `onSelectionDelete`: Handler for bulk delete action
 * - `onSelectionExport`: Handler for bulk export action
 *
 * When items are selected, bulk action buttons appear in the toolbar.
 * Selection is automatically disabled in read-only mode.
 */
export const Selection: StoryObj = {
  render: () => {
    const { Column, Action } = ContentListTable;

    const onClick = (item: ContentListItem) => action('click')(item.title);
    const onEdit = (item: ContentListItem) => action('edit')(item.title);
    const onDelete = (item: ContentListItem) => action('delete')(item.title);
    const onSelectionDelete = (items: ContentListItem[]) =>
      action('bulk-delete')(items.map((i) => i.title));
    const onSelectionExport = (items: ContentListItem[]) =>
      action('bulk-export')(items.map((i) => i.title));

    const findItems = createSimpleMockFindItems();

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems }}
        services={basicServices}
        item={{ actions: { onClick, onEdit, onDelete } }}
        features={{
          search: { placeholder: 'Search dashboards...' },
          selection: {
            onSelectionDelete,
            onSelectionExport,
          },
        }}
      >
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>Selection & Bulk Actions</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>
                  Select rows using checkboxes. Bulk actions appear in the toolbar when items are
                  selected.
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListToolbar />
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListTable title="Selectable dashboards">
                <Column.Name />
                <Column.UpdatedAt />
                <Column.Actions>
                  <Action.Edit />
                  <Action.Delete />
                </Column.Actions>
              </ContentListTable>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </ContentListProvider>
    );
  },
};

/**
 * ## Favorites
 *
 * Enable favorites/starring with the `features.favorites` or `features.starred` configuration.
 *
 * When enabled:
 * - Star button appears in the Name column (configurable via `Column.Name showStarred`)
 * - Starred filter toggle appears in the toolbar
 * - Requires `services.favorites` to be configured
 */
export const Favorites: StoryObj = {
  render: () => {
    const { Column, Action } = ContentListTable;

    const onClick = (item: ContentListItem) => action('click')(item.title);
    const onEdit = (item: ContentListItem) => action('edit')(item.title);
    const findItems = createSimpleMockFindItems();

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems }}
        services={favoritesServices}
        item={{ actions: { onClick, onEdit } }}
        features={{
          search: { placeholder: 'Search dashboards...' },
          starred: true,
          filtering: {
            starred: true,
          },
        }}
      >
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>Favorites</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>
                  Click the star icon to favorite items. Use the Starred filter to show only
                  favorites.
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListToolbar />
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListTable title="Dashboards with favorites">
                <Column.Name showStarred />
                <Column.UpdatedAt />
                <Column.Actions>
                  <Action.Edit />
                </Column.Actions>
              </ContentListTable>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </ContentListProvider>
    );
  },
};
