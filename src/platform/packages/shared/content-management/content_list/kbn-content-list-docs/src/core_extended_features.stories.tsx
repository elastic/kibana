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
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { ContentListProvider } from '@kbn/content-list-provider';
import type { ContentListItem } from '@kbn/content-list-provider';
import { ContentListTable } from '@kbn/content-list-table';
import { ContentListFooter } from '@kbn/content-list-footer';
import { ContentListToolbar } from '@kbn/content-list-toolbar';
import {
  createMockFavoritesClient,
  createStoryFindItems,
  mockTagsService,
  mockUserProfileServices,
  StateDiagnosticPanel,
} from './stories_helpers';

// =============================================================================
// Storybook Meta
// =============================================================================

const meta: Meta = {
  title: 'Content List/Core Features + Extended',
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
// Core Features + Extended Story (MS3)
// =============================================================================

const { Column, Action } = ContentListTable;
const { Filters } = ContentListToolbar;

/**
 * Wrapper component for the "Core + Extended" story.
 *
 * Demonstrates the full extended feature set: tag filtering, tag badges in the
 * Name column, the starred toggle filter, the star icon column, and the
 * `createdBy` user filter with avatar column.
 *
 * Current state of extended features:
 * - [x] Tags filter popover — include/exclude, Cmd/Ctrl+click (PR 9)
 * - [x] Tag badges in Name column — click to filter (PR 9)
 * - [x] Search bar ↔ filter sync — `tag:name` parsed to `filters.tag` (PR 9)
 * - [x] Starred column — star icon toggle per row
 * - [x] Starred filter — toggle to show only starred items
 * - [x] Created By column — user avatar with filter toggle on click
 * - [x] Created By filter popover — user selection and sentinel values
 */
const CoreTagsStarredFeaturesWrapper = () => {
  const labels = useMemo(
    () => ({
      entity: 'dashboard',
      entityPlural: 'dashboards',
    }),
    []
  );

  const favoritesClient = useMemo(() => createMockFavoritesClient(), []);

  const dataSource = useMemo(() => {
    const findItems = createStoryFindItems({ totalItems: 30, favoritesClient });
    return { findItems };
  }, [favoritesClient]);

  const features = useMemo(
    () => ({
      sorting: {
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
      },
      pagination: { initialPageSize: 20 },
      tags: true as const,
      starred: true as const,
      createdBy: true as const,
    }),
    []
  );

  const itemConfig = useMemo(
    () => ({
      getHref: (item: ContentListItem) => `#/dashboards/${item.id}`,
      onDelete: async (_items: ContentListItem[]) => {
        await new Promise((resolve) => setTimeout(resolve, 300));
      },
    }),
    []
  );

  const tableChildren = useMemo(
    () => (
      <>
        <Column.Starred />
        <Column.Name showDescription showTags showStarred />
        <Column.CreatedBy />
        <Column.UpdatedAt />
        <Column.Actions>
          <Action.Delete />
        </Column.Actions>
      </>
    ),
    []
  );

  const displayElement = useMemo(
    () => (
      <ContentListProvider
        id="core-tags-starred-features"
        labels={labels}
        dataSource={dataSource}
        features={features}
        item={itemConfig}
        services={{
          tags: mockTagsService,
          favorites: favoritesClient,
          userProfile: mockUserProfileServices,
        }}
      >
        <ContentListToolbar>
          <Filters>
            <Filters.Starred />
            <Filters.Tags />
            <Filters.CreatedBy />
            <Filters.Sort />
          </Filters>
        </ContentListToolbar>
        <ContentListTable title="dashboards table">{tableChildren}</ContentListTable>
        <ContentListFooter />
      </ContentListProvider>
    ),
    [labels, dataSource, features, itemConfig, favoritesClient, tableChildren]
  );

  return (
    <ContentListProvider
      id="core-tags-starred-features"
      labels={labels}
      dataSource={dataSource}
      features={features}
      item={itemConfig}
      services={{
        tags: mockTagsService,
        favorites: favoritesClient,
        userProfile: mockUserProfileServices,
      }}
    >
      <EuiTitle size="s">
        <h2>Core Features + Extended</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          Core + Tags + Starred + Created By — the full extended feature set. Demonstrates the
          starred toggle filter and star icon column (backed by <code>services.favorites</code>),
          tag filtering and tag badges, and the Created By avatar column and filter popover (backed
          by <code>services.userProfile</code>).
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <ContentListToolbar>
            <Filters>
              <Filters.Starred />
              <Filters.Tags />
              <Filters.CreatedBy />
              <Filters.Sort />
            </Filters>
          </ContentListToolbar>
        </EuiFlexItem>
        <EuiFlexItem>
          <ContentListTable title="dashboards table">{tableChildren}</ContentListTable>
        </EuiFlexItem>
        <EuiFlexItem>
          <ContentListFooter />
        </EuiFlexItem>
        <EuiFlexItem>
          <StateDiagnosticPanel defaultOpen element={displayElement} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ContentListProvider>
  );
};

/**
 * The "Extended" feature set: Core + Tags + Starred + Created By.
 *
 * Builds on Tags and Starred and adds:
 * - `services.userProfile` on the provider wires the user profile service.
 * - `features.createdBy: true` enables the creator filter and column.
 * - `Column.CreatedBy` renders a user avatar with filter-toggle on click.
 * - `Filters.CreatedBy` in the toolbar renders a user selection popover.
 *
 * **Try:** Click a user avatar in the "Created by" column to filter by that
 * creator. Open the "Created by" popover to select multiple users, or type
 * `createdBy:(email)` in the search bar. Sentinel values "managed" and "none"
 * are also supported.
 */
export const CoreTagsStarredFeatures: StoryObj = {
  name: 'Core Features + Extended',
  render: () => <CoreTagsStarredFeaturesWrapper />,
};
