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
import { createStoryFindItems, StateDiagnosticPanel } from './stories_helpers';

// =============================================================================
// Storybook Meta
// =============================================================================

const meta: Meta = {
  title: 'Content List/Core Features',
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
const CoreFeaturesWrapper = () => {
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

  const displayElement = useMemo(
    () => (
      <ContentListProvider
        id="core-features"
        labels={labels}
        dataSource={dataSource}
        features={features}
        item={itemConfig}
      >
        <ContentListToolbar />
        <ContentListTable title="dashboards table">{tableChildren}</ContentListTable>
        <ContentListFooter />
      </ContentListProvider>
    ),
    [labels, dataSource, features, itemConfig, tableChildren]
  );

  return (
    <ContentListProvider id="core-features" {...{ labels, dataSource, features }} item={itemConfig}>
      <EuiTitle size="s">
        <h2>Core Features</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          The minimum feature set required to migrate the simplest <code>TableListView</code>{' '}
          consumers (Graph, Files Management) to Content List. Core = Search + Sort + Pagination +
          UpdatedAt + Actions + Selection + Delete.
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <ContentListToolbar />
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
 * The "Core" feature set: the minimum capabilities required to migrate the
 * simplest `TableListView` consumers (Graph, Files Management) to Content
 * List.
 *
 * **Core** = Search + Sort + Pagination + UpdatedAt + Actions + Selection + Delete
 *
 * This story is intentionally non-configurable — it represents the
 * opinionated, production-like composition that a consumer like Graph or
 * Files Management would use. It demonstrates the two-layer architecture:
 * a `ContentListProvider` that owns data-fetching and state, with
 * composable `ContentListToolbar`, `ContentListTable`, and
 * `ContentListFooter` children that read from the provider via context.
 */
export const CoreFeatures: StoryObj = {
  name: 'Core Features',
  render: () => <CoreFeaturesWrapper />,
};
