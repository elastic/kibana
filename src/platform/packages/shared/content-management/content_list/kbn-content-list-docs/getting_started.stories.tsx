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

/** Minimal services - no filters enabled. */
const minimalServices = createMockServices();

/** Full services with tags, favorites, and user profiles enabled. */
const fullServices = createMockServices({
  tags: true,
  tagList: MOCK_TAGS,
  favorites: true,
  userProfiles: true,
});

const meta: Meta = {
  title: 'Content Management/Content List/Getting Started',
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
 * ## Minimal Configuration
 *
 * The simplest possible content list setup. This configuration includes:
 * - Basic table with Name and UpdatedAt columns
 * - Default row actions (Edit, Delete)
 * - No search, filtering, or selection
 *
 * This is ideal for simple listing pages that don't need advanced features.
 */
export const Minimal: StoryObj = {
  render: () => {
    const onClick = (item: ContentListItem) => action('click')(item.title);
    const onEdit = (item: ContentListItem) => action('edit')(item.title);
    const onDelete = (item: ContentListItem) => action('delete')(item.title);
    const findItems = createSimpleMockFindItems();

    return (
      <ContentListProvider
        entityName="saved object"
        entityNamePlural="saved objects"
        dataSource={{ findItems }}
        services={minimalServices}
        item={{ actions: { onClick, onEdit, onDelete } }}
      >
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>Saved Objects</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListTable title="Minimal saved objects table" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </ContentListProvider>
    );
  },
};

/**
 * ## Full Featured
 *
 * A complete content list with all features enabled:
 * - **Search**: Text search with configurable placeholder
 * - **Filtering**: Tags, created by, starred filter
 * - **Sorting**: Sort dropdown with multiple fields
 * - **Selection**: Row checkboxes with bulk delete/export actions
 * - **Row Actions**: View Details, Edit, Duplicate, Delete
 * - **Favorites**: Star/unstar items
 * - **User Profiles**: Show creator avatars
 *
 * This demonstrates the full capabilities of the content list components.
 */
export const FullFeatured: StoryObj = {
  render: () => {
    const { Column, Action } = ContentListTable;

    const handleClick = (item: ContentListItem) => action('navigate')(item.title);
    const handleViewDetails = (item: ContentListItem) => action('view-details')(item.title);
    const handleEdit = (item: ContentListItem) => action('edit')(item.title);
    const handleDuplicate = (item: ContentListItem) => action('duplicate')(item.title);
    const handleDelete = (item: ContentListItem) => action('delete')(item.title);
    const getHref = (item: ContentListItem) => `#/dashboard/${item.id}`;

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
        services={fullServices}
        item={{
          getHref,
          actions: {
            onClick: handleClick,
            onViewDetails: handleViewDetails,
            onEdit: handleEdit,
            onDuplicate: handleDuplicate,
            onDelete: handleDelete,
          },
        }}
        features={{
          starred: true,
          tags: true,
          userProfiles: true,
          search: { placeholder: 'Search dashboards...' },
          sorting: {
            initialSort: { field: 'updatedAt', direction: 'desc' },
          },
          filtering: {
            tags: true,
            users: true,
          },
          selection: {
            onSelectionDelete,
            onSelectionExport,
          },
          pagination: { initialPageSize: 10 },
        }}
      >
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>Dashboard Manager</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>Full-featured content list with all options enabled.</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListToolbar>
                <ContentListToolbar.Filters>
                  <ContentListToolbar.Filters.Starred />
                  <ContentListToolbar.Filters.Sort />
                  <ContentListToolbar.Filters.Tags />
                  <ContentListToolbar.Filters.CreatedBy />
                </ContentListToolbar.Filters>
              </ContentListToolbar>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListTable title="Full featured dashboards table">
                <Column.Name showStarred showTags showDescription />
                <Column.CreatedBy />
                <Column.UpdatedAt />
                <Column.Actions>
                  <Action.ViewDetails />
                  <Action.Edit />
                  <Action.Duplicate />
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
