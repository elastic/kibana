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
  buildMockItems,
  createMockFavoritesClient,
  createStoryFindItems,
  createMockTagFacetProvider,
  createMockUserProfileFacetProvider,
  mockTagsService,
  mockContentListUserProfilesServices,
  StateDiagnosticPanel,
  useInspectFlyout,
} from './stories_helpers';

// =============================================================================
// Storybook Meta
// =============================================================================

interface ExtendedStoryArgs {
  scrollableInline: boolean;
  responsiveBreakpoint: boolean;
}

const meta: Meta<ExtendedStoryArgs> = {
  title: 'Content List/Core Features + Extended',
  argTypes: {
    scrollableInline: {
      control: 'boolean',
      description: 'Enable horizontal scrolling when columns exceed container width.',
    },
    responsiveBreakpoint: {
      control: 'boolean',
      description: 'Collapse the table into responsive cards on narrow viewports.',
    },
  },
  args: {
    scrollableInline: true,
    responsiveBreakpoint: false,
  },
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
// Wrapper component
// =============================================================================

const { Column, Action } = ContentListTable;
const { Filters } = ContentListToolbar;

/**
 * Wrapper component for the MS3 "Core + Tags + Starred + Created By" story.
 *
 * MS3 (Dashboards migration) requires Core + Tags + Starred + Created By. This
 * story demonstrates the full extended feature set: tag filtering, tag badges in
 * the Name column, the starred toggle filter, the star icon column, and the
 * Created By filter popover (include/exclude by user profile).
 *
 * Current state of MS3 features:
 * - [x] Tags filter popover — include/exclude, Cmd/Ctrl+click (PR 9)
 * - [x] Tag badges in Name column — click to filter (PR 9)
 * - [x] Search bar ↔ filter sync — `tag:name` parsed to `filters.tag` (PR 9)
 * - [x] Starred column — star icon toggle per row
 * - [x] Starred filter — toggle to show only starred items
 * - [x] Created By filter — include/exclude by user (PR 10)
 * - [x] Content editor — "View details" row action via `item.onInspect` (PR 12)
 */
const CoreTagsStarredFeaturesWrapper = ({
  scrollableInline = true,
  responsiveBreakpoint = false,
}: ExtendedStoryArgs) => {
  const { onInspect, flyout } = useInspectFlyout();

  const labels = useMemo(
    () => ({
      entity: 'dashboard',
      entityPlural: 'dashboards',
    }),
    []
  );

  const favoritesClient = useMemo(() => createMockFavoritesClient([]), []);
  const mockItems = useMemo(() => buildMockItems(30), []);

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
      tags: createMockTagFacetProvider(mockItems),
      starred: true as const,
      userProfiles: createMockUserProfileFacetProvider(mockItems),
    }),
    [mockItems]
  );

  const itemConfig = useMemo(
    () => ({
      getHref: (item: ContentListItem) => `#/dashboards/${item.id}`,
      onDelete: async (_items: ContentListItem[]) => {
        await new Promise((resolve) => setTimeout(resolve, 300));
      },
      onInspect,
    }),
    [onInspect]
  );

  const tableChildren = useMemo(
    () => (
      <>
        <Column.Starred />
        <Column.Name showDescription showTags showStarred />
        <Column.CreatedBy />
        <Column.UpdatedAt />
        <Column.Actions>
          <Action.Inspect />
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
          userProfiles: mockContentListUserProfilesServices,
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
        <ContentListTable title="dashboards table" {...{ scrollableInline, responsiveBreakpoint }}>
          {tableChildren}
        </ContentListTable>
        <ContentListFooter />
      </ContentListProvider>
    ),
    [
      labels,
      dataSource,
      features,
      itemConfig,
      favoritesClient,
      tableChildren,
      scrollableInline,
      responsiveBreakpoint,
    ]
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
        userProfiles: mockContentListUserProfilesServices,
      }}
    >
      <EuiTitle size="s">
        <h2>Core Features + Extended</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          Core + Tags + Starred + Created By — the feature set required to migrate Dashboards to
          Content List. Demonstrates the starred toggle filter, star icon column, tag filtering, and
          the Created By filter popover (include/exclude by user profile).
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
          <ContentListTable
            title="dashboards table"
            {...{ scrollableInline, responsiveBreakpoint }}
          >
            {tableChildren}
          </ContentListTable>
        </EuiFlexItem>
        <EuiFlexItem>
          <ContentListFooter />
        </EuiFlexItem>
        <EuiFlexItem>
          <StateDiagnosticPanel defaultOpen element={displayElement} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {flyout}
    </ContentListProvider>
  );
};

/**
 * The "Extended" feature set: Core + Tags + Starred + Created By.
 *
 * Required by the Dashboards migration (MS3). Builds on MS2 (Tags) and adds:
 * - `services.favorites` on the provider wires the favorites client.
 * - `services.userProfiles` on the provider wires user profile data.
 * - `features.starred: true` enables starred state and the `Filters.Starred` preset.
 * - `features.userProfiles: true` enables user-based filtering.
 * - `Column.Starred` renders a star icon toggle in a narrow leading column.
 * - `Filters.Starred` in the toolbar renders a toggle to show only starred items.
 * - `Filters.CreatedBy` in the toolbar renders a user filter popover.
 *
 * **Try:** Click the star icon in any row to mark it as a favorite. Toggle the
 * "Starred" filter to narrow the list. Use the "Created by" filter to filter by
 * user, or type `createdBy:email` in the search bar. Hold Cmd/Ctrl to exclude.
 */
type Story = StoryObj<ExtendedStoryArgs>;

export const CoreTagsStarredFeatures: Story = {
  name: 'Core Features + Extended',
  render: (args) => <CoreTagsStarredFeaturesWrapper {...args} />,
};
