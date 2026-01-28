/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle, EuiText, EuiCallOut } from '@elastic/eui';
import { ContentListToolbar } from '@kbn/content-list-toolbar';
import { ContentListTable } from '@kbn/content-list-table';
import {
  ContentListProvider,
  useContentListSearch,
  type ContentListItem,
  type FindItemsFn,
} from '@kbn/content-list-provider';
import { createSimpleMockFindItems, createMockServices } from '@kbn/content-list-mock-data';

const mockServices = createMockServices();

const meta: Meta = {
  title: 'Content Management/Content List/States',
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
 * Creates a `findItems` function with configurable behavior for demo states.
 */
const createMockFindItems = (options?: {
  delay?: number;
  shouldError?: boolean;
  isEmpty?: boolean;
}): FindItemsFn => {
  const { delay = 0, shouldError = false, isEmpty = false } = options ?? {};
  const baseFindItems = createSimpleMockFindItems();

  return async (params) => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (shouldError) {
      throw new Error('Failed to fetch items. Please try again.');
    }

    if (isEmpty) {
      return { items: [], total: 0 };
    }

    return baseFindItems(params);
  };
};

/**
 * ## Loading State
 *
 * The table shows a loading indicator while data is being fetched.
 * This state appears during initial load and when filters/search change.
 */
export const Loading: StoryObj = {
  render: () => {
    const findItems = createMockFindItems({ delay: 60000 });

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems }}
        services={mockServices}
      >
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>Loading State</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>The table shows a loading indicator while data is being fetched.</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListToolbar />
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListTable title="Loading dashboards" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </ContentListProvider>
    );
  },
};

/**
 * ## Empty State (No Items)
 *
 * Shown when the collection has no items at all (first-time use).
 * Configure `features.globalActions.onCreate` to show a "Create" button.
 */
export const Empty: StoryObj = {
  render: () => {
    const onCreate = () => action('create')('New dashboard');
    const findItems = createMockFindItems({ isEmpty: true });

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems }}
        services={mockServices}
        features={{ globalActions: { onCreate } }}
      >
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>Empty State (No Items)</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>Shown when the collection is completely empty (first-time use).</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListTable title="Empty dashboards" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </ContentListProvider>
    );
  },
};

/**
 * Helper component to trigger a search that returns no results.
 */
const NoResultsTrigger = ({ children }: { children: React.ReactNode }) => {
  const { setSearch } = useContentListSearch();

  useEffect(() => {
    setSearch('xyznonexistent123');
  }, [setSearch]);

  return <>{children}</>;
};

/**
 * ## No Results State
 *
 * Shown when search or filters return no matches, but items exist in the collection.
 * The user can clear filters or modify their search to find results.
 */
export const NoResults: StoryObj = {
  render: () => {
    const findItems = createSimpleMockFindItems();

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems }}
        services={mockServices}
        features={{
          search: { placeholder: 'Search dashboards...' },
        }}
      >
        <NoResultsTrigger>
          <EuiPanel>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>No Results State</h3>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  <p>Shown when search or filters return no matches.</p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <ContentListToolbar />
              </EuiFlexItem>
              <EuiFlexItem>
                <ContentListTable title="No results dashboards" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </NoResultsTrigger>
      </ContentListProvider>
    );
  },
};

/**
 * ## Error State
 *
 * Shown when data fetching fails. The error message is displayed to the user
 * with an option to retry.
 */
export const ErrorState: StoryObj = {
  name: 'Error',
  render: () => {
    const findItems = createMockFindItems({ shouldError: true });

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems }}
        services={mockServices}
      >
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>Error State</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>Shown when data fetching fails.</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListTable title="Error dashboards" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </ContentListProvider>
    );
  },
};

/**
 * ## Read-Only Mode
 *
 * Set `isReadOnly={true}` on the provider to disable all editing and selection.
 * Useful for viewer roles or embedded contexts where modification isn't allowed.
 *
 * In read-only mode:
 * - Row selection checkboxes are hidden
 * - Bulk actions are disabled
 * - Row actions that modify data (edit, delete) are hidden
 */
export const ReadOnly: StoryObj = {
  render: () => {
    const { Column, Action } = ContentListTable;

    const onClick = (item: ContentListItem) => action('click')(item.title);
    const onViewDetails = (item: ContentListItem) => action('view-details')(item.title);
    const getHref = (item: ContentListItem) => `#/dashboard/${item.id}`;
    const findItems = createSimpleMockFindItems();

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems }}
        services={mockServices}
        isReadOnly
        item={{
          getHref,
          actions: {
            onClick,
            onViewDetails,
          },
        }}
        features={{
          search: { placeholder: 'Search dashboards...' },
          sorting: { initialSort: { field: 'updatedAt', direction: 'desc' } },
        }}
      >
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>Read-Only Mode</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>Actions and selection are disabled. Only viewing is allowed.</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiCallOut title="Read-only mode" color="warning" iconType="lock" size="s">
                <p>This list is in read-only mode. Editing and selection are disabled.</p>
              </EuiCallOut>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListToolbar />
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListTable title="Read-only dashboards">
                <Column.Name />
                <Column.UpdatedAt />
                <Column.Actions>
                  <Action.ViewDetails />
                </Column.Actions>
              </ContentListTable>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </ContentListProvider>
    );
  },
};
