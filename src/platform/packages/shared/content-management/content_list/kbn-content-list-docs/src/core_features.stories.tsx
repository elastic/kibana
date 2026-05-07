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
import { EuiSpacer } from '@elastic/eui';
import {
  ContentList,
  ContentListProvider,
  ContentListTable,
  ContentListFooter,
  ContentListToolbar,
  type ContentListItem,
} from '@kbn/content-list';
import {
  createStoryFindItems,
  DashboardListingEmptyPromptMock,
  DashboardListingStoryFrame,
  StateDiagnosticPanel,
} from './stories_helpers';

// =============================================================================
// Storybook Meta
// =============================================================================

interface CoreFeaturesStoryArgs {
  scrollableInline: boolean;
  responsiveBreakpoint: boolean;
}

const meta: Meta<CoreFeaturesStoryArgs> = {
  title: 'Content List/Core Features',
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
// Core Features Story
// =============================================================================

const { Column, Action } = ContentListTable;

/**
 * Wrapper component for the MS1 story.
 *
 * MS1 (Graph / Files Management migration) requires the "Core" feature set:
 * search, sorting, pagination, updatedAt column, actions, selection, and
 * delete.  This story is progressively updated as each PR lands.
 *
 * Current state of MS1 features:
 * - [x] Sorting (PR 1 — Provider Foundation)
 * - [x] Table + Toolbar + Columns (PR 2 — UI Foundation)
 * - [x] Pagination (PR 3)
 * - [x] UpdatedAt column (PR 5)
 * - [x] Actions column (PR 6)
 * - [x] Delete orchestration (PR 8)
 * - [x] Search (PR 4)
 * - [x] Selection + bulk bar (PR 7)
 */
const CoreFeaturesWrapper = ({
  scrollableInline = true,
  responsiveBreakpoint = false,
}: CoreFeaturesStoryArgs) => {
  const labels = useMemo(
    () => ({
      entity: 'dashboard',
      entityPlural: 'dashboards',
    }),
    []
  );

  const dataSource = useMemo(() => {
    const findItems = createStoryFindItems({ totalItems: 30 });
    return { findItems };
  }, []);

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
    }),
    []
  );

  const itemConfig = useMemo(
    () => ({
      getHref: (item: ContentListItem) => `#/dashboard/${item.id}`,
      onEdit: (item: ContentListItem) => alert(`Edit: ${item.title}`),
      onDelete: async (_items: ContentListItem[]) => {
        await new Promise((resolve) => setTimeout(resolve, 300));
      },
    }),
    []
  );

  const tableChildren = useMemo(
    () => (
      <>
        <Column.Name showDescription />
        <Column.UpdatedAt />
        <Column.Actions>
          <Action.Edit />
          <Action.Delete />
        </Column.Actions>
      </>
    ),
    []
  );

  const emptyStateElement = useMemo(() => <DashboardListingEmptyPromptMock />, []);

  const displayElement = useMemo(
    () => (
      <ContentListProvider
        id="core-features"
        labels={labels}
        dataSource={dataSource}
        features={features}
        item={itemConfig}
      >
        <ContentList emptyState={emptyStateElement}>
          <ContentListToolbar />
          <ContentListTable title="Dashboards" {...{ scrollableInline, responsiveBreakpoint }}>
            {tableChildren}
          </ContentListTable>
          <ContentListFooter />
        </ContentList>
      </ContentListProvider>
    ),
    [
      labels,
      dataSource,
      features,
      itemConfig,
      tableChildren,
      emptyStateElement,
      scrollableInline,
      responsiveBreakpoint,
    ]
  );

  return (
    <DashboardListingStoryFrame>
      <ContentListProvider
        id="core-features"
        {...{ labels, dataSource, features }}
        item={itemConfig}
      >
        <ContentList emptyState={emptyStateElement}>
          <ContentListToolbar />
          <ContentListTable title="Dashboards" {...{ scrollableInline, responsiveBreakpoint }}>
            {tableChildren}
          </ContentListTable>
          <ContentListFooter />
        </ContentList>
        <EuiSpacer size="m" />
        <StateDiagnosticPanel defaultOpen element={displayElement} />
      </ContentListProvider>
    </DashboardListingStoryFrame>
  );
};

/**
 * The "Core" feature set: the minimum capabilities required to migrate the
 * simplest `TableListView` consumers (Graph, Files Management) to Content
 * List.
 *
 * **Core** = Search + Sort + Pagination + UpdatedAt + Actions + Selection + Delete
 *
 * This story is intentionally non-configurable — it represents a
 * production-like feature-owned page shell with `ContentList` embedded
 * inside it. It demonstrates the lower-level composition that a consumer
 * like Dashboards or Graph can use when it needs custom page chrome around
 * the list region.
 */
type Story = StoryObj<CoreFeaturesStoryArgs>;

export const CoreFeatures: Story = {
  name: 'Core Features',
  render: (args) => <CoreFeaturesWrapper {...args} />,
};
