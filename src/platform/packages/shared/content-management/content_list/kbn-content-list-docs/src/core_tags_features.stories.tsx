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
import { createStoryFindItems, mockTagsService, StateDiagnosticPanel } from './stories_helpers';

// =============================================================================
// Storybook Meta
// =============================================================================

const meta: Meta = {
  title: 'Content List/Tags Features',
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
// Tags Features Story (MS2)
// =============================================================================

const { Column, Action } = ContentListTable;
const { Filters } = ContentListToolbar;

/**
 * Wrapper component for the MS2 Tags story.
 *
 * MS2 (Maps migration) requires Core + Tags. This story shows the full
 * tag filtering flow: tag badges in the Name column, the Tags filter
 * popover (include/exclude), and search bar query sync (`tag:(Production)`).
 *
 * Current state of MS2 features:
 * - [x] Tags filter popover — include/exclude, Cmd/Ctrl+click (PR 9)
 * - [x] Tag badges in Name column — click to filter (PR 9)
 * - [x] Search bar ↔ filter sync — `tag:name` parsed to `filters.tag` (PR 9)
 */
const TagsFeaturesWrapper = () => {
  const labels = useMemo(
    () => ({
      entity: 'map',
      entityPlural: 'maps',
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
      tags: true as const,
    }),
    []
  );

  const itemConfig = useMemo(
    () => ({
      getHref: (item: ContentListItem) => `#/maps/${item.id}`,
      onDelete: async (_items: ContentListItem[]) => {
        await new Promise((resolve) => setTimeout(resolve, 300));
      },
    }),
    []
  );

  const tableChildren = useMemo(
    () => (
      <>
        <Column.Name showDescription showTags />
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
        id="tags-features"
        labels={labels}
        dataSource={dataSource}
        features={features}
        item={itemConfig}
        services={{ tags: mockTagsService }}
      >
        <ContentListToolbar>
          <Filters>
            <Filters.Tags />
            <Filters.Sort />
          </Filters>
        </ContentListToolbar>
        <ContentListTable title="maps table">{tableChildren}</ContentListTable>
        <ContentListFooter />
      </ContentListProvider>
    ),
    [labels, dataSource, features, itemConfig, tableChildren]
  );

  return (
    <ContentListProvider
      id="tags-features"
      labels={labels}
      dataSource={dataSource}
      features={features}
      item={itemConfig}
      services={{ tags: mockTagsService }}
    >
      <EuiTitle size="s">
        <h2>Tags Features</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          Core + Tags — the feature set required to migrate Maps to Content List. Demonstrates the
          Tags filter popover (include/exclude via Cmd/Ctrl+click), tag badges in the Name column
          (click to filter), and search bar query sync (<code>tag:(name)</code> ↔{' '}
          <code>filters.tag</code>).
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <ContentListToolbar>
            <Filters>
              <Filters.Tags />
              <Filters.Sort />
            </Filters>
          </ContentListToolbar>
        </EuiFlexItem>
        <EuiFlexItem>
          <ContentListTable title="maps table">{tableChildren}</ContentListTable>
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
 * The "Tags" feature set: Core + tag filtering and display.
 *
 * Required by the Maps migration (MS2). Adds:
 * - `services.tags` on the provider wires the tag service.
 * - `features.tags: true` enables tag state and the `Filters.Tags` preset.
 * - `Column.Name showTags` renders clickable tag badges beneath each title.
 * - `Filters.Tags` in the toolbar renders an include/exclude popover.
 * - Typing `tag:name` in the search bar syncs to `filters.tag` via the
 *   tag query parser pipeline.
 *
 * **Try:** Click a tag badge in the table to toggle it as a filter. Hold
 * Cmd (Mac) or Ctrl (Windows/Linux) while clicking to exclude instead.
 * Type `tag:Production` directly in the search bar to see query sync.
 */
export const TagsFeatures: StoryObj = {
  name: 'Tags Features',
  render: () => <TagsFeaturesWrapper />,
};
