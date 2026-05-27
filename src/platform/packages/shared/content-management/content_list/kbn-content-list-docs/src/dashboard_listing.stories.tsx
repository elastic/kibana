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
import { EuiButton, EuiSpacer } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import {
  ContentList,
  ContentListProvider,
  ContentListTable,
  ContentListFooter,
  ContentListToolbar,
} from '@kbn/content-list';
import { KibanaContentListPage } from '@kbn/content-list-page';
import {
  MOCK_DASHBOARDS,
  createMockFavoritesClient,
  mockContentListUserProfilesServices,
  mockTagsService,
} from '@kbn/content-list-mock-data';
import {
  DashboardListingEmptyPromptMock,
  DashboardListingStoryFrame,
  StateDiagnosticPanel,
  createMockStoryFindItems,
  createMockTagFacetProvider,
  createMockUserProfileFacetProvider,
  useContentEditorFlyout,
} from './stories_helpers';

const { Section } = KibanaContentListPage;

const meta: Meta = {
  title: 'Content List/Dashboard Listing',
};

export default meta;

const { Column, Action } = ContentListTable;
const { Filters } = ContentListToolbar;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const labels = {
  entity: 'dashboard',
  entityPlural: 'dashboards',
} as const;

const useDashboardProviderProps = ({
  openContentEditor,
}: {
  openContentEditor?: (item: ContentListItem) => void;
}) => {
  const favoritesClient = useMemo(
    () => createMockFavoritesClient(['dashboard-001', 'dashboard-003', 'dashboard-007']),
    []
  );

  const dataSource = useMemo(
    () => ({
      debounceMs: 0,
      findItems: createMockStoryFindItems({
        items: MOCK_DASHBOARDS,
        favoritesClient,
      }),
    }),
    [favoritesClient]
  );

  const features = useMemo(
    () => ({
      sorting: {
        initialSort: { field: 'updatedAt', direction: 'desc' as const },
        fields: [
          { field: 'title', name: 'Name' },
          { field: 'updatedAt', name: 'Last updated' },
        ],
      },
      pagination: { initialPageSize: 20 },
      tags: createMockTagFacetProvider(MOCK_DASHBOARDS),
      starred: true as const,
      userProfiles: createMockUserProfileFacetProvider(MOCK_DASHBOARDS),
      // Original story leaves this undefined, which makes `<Action.ContentEditor />` self-skip.
      ...(openContentEditor ? { contentEditor: { open: openContentEditor } } : {}),
    }),
    [openContentEditor]
  );

  const item = useMemo(
    () => ({
      getHref: (content: ContentListItem) => `#/dashboard/${content.id}`,
      actions: {
        // The edit row icon renders as an `<a href>` link, preserving
        // right/middle-click open-in-new-tab and keyboard activation.
        edit: {
          getItemActionHref: (content: ContentListItem) => `#/dashboard/${content.id}?view=edit`,
        },
        delete: {
          onBulkAction: async () => {
            await wait(250);
          },
        },
      },
    }),
    []
  );

  return { dataSource, favoritesClient, features, item };
};

const OriginalStory = () => {
  const { favoritesClient, ...providerProps } = useDashboardProviderProps({});

  const pageElement = useMemo(
    () => (
      <DashboardListingStoryFrame>
        <ContentList emptyState={<DashboardListingEmptyPromptMock />}>
          <ContentListToolbar>
            <Filters>
              <Filters.Starred />
              <Filters.Tags />
              <Filters.CreatedBy />
              <Filters.Sort />
            </Filters>
          </ContentListToolbar>
          <ContentListTable title="Dashboards">
            <Column.Name showDescription showTags showStarred />
            <Column.CreatedBy />
            <Column.UpdatedAt />
            <Column.Actions>
              <Action.Edit />
              <Action.Delete />
            </Column.Actions>
          </ContentListTable>
          <ContentListFooter />
        </ContentList>
      </DashboardListingStoryFrame>
    ),
    []
  );

  return (
    <ContentListProvider
      id="dashboard-listing-original"
      labels={labels}
      services={{
        favorites: favoritesClient,
        tags: mockTagsService,
        userProfiles: mockContentListUserProfilesServices,
      }}
      {...providerProps}
    >
      {pageElement}
      <EuiSpacer size="m" />
      <StateDiagnosticPanel element={pageElement} />
    </ContentListProvider>
  );
};

const ProposalStory = () => {
  const { open: openContentEditor, flyout } = useContentEditorFlyout();
  const { favoritesClient, ...providerProps } = useDashboardProviderProps({
    openContentEditor,
  });

  const pageElement = useMemo(
    () => (
      <KibanaContentListPage>
        <KibanaContentListPage.Header
          title="Dashboards"
          tabs={[{ label: 'Dashboards', isSelected: true, onClick: () => undefined }]}
          actions={
            <EuiButton fill iconType="plusInCircle">
              Create dashboard
            </EuiButton>
          }
        />
        <Section>
          <ContentList emptyState={<DashboardListingEmptyPromptMock />}>
            <ContentListToolbar>
              <Filters>
                <Filters.Starred />
                <Filters.Tags />
                <Filters.CreatedBy />
                <Filters.Sort />
              </Filters>
            </ContentListToolbar>
            <ContentListTable title="Dashboards">
              <Column.Name showDescription showTags showStarred />
              <Column.CreatedBy />
              <Column.UpdatedAt />
              <Column.Actions>
                <Action.ContentEditor />
                <Action.Edit />
                <Action.Delete />
              </Column.Actions>
            </ContentListTable>
            <ContentListFooter />
            {flyout}
          </ContentList>
        </Section>
      </KibanaContentListPage>
    ),
    [flyout]
  );

  return (
    <ContentListProvider
      id="dashboard-listing-proposal"
      labels={labels}
      services={{
        favorites: favoritesClient,
        tags: mockTagsService,
        userProfiles: mockContentListUserProfilesServices,
      }}
      {...providerProps}
    >
      {pageElement}
      <EuiSpacer size="m" />
      <StateDiagnosticPanel element={pageElement} />
    </ContentListProvider>
  );
};

// =============================================================================
// Bulk-delete partition and selection gating
// =============================================================================

/**
 * IDs of dashboards treated as managed for these stories.
 */
const MANAGED_DASHBOARD_IDS = new Set(['dashboard-002', 'dashboard-005']);

const MANAGED_DELETE_RESTRICTION = 'Managed dashboards cannot be deleted.';
const MANAGED_EDIT_RESTRICTION = 'Managed dashboards cannot be edited.';

const decorateAsManaged = (items: typeof MOCK_DASHBOARDS): typeof MOCK_DASHBOARDS =>
  items.map((dashboard) =>
    MANAGED_DASHBOARD_IDS.has(dashboard.id) ? { ...dashboard, managed: true } : dashboard
  );

const restrictManagedDelete = (content: ContentListItem) =>
  content.managed ? MANAGED_DELETE_RESTRICTION : undefined;
const restrictManagedEdit = (content: ContentListItem) =>
  content.managed ? MANAGED_EDIT_RESTRICTION : undefined;

const BulkDeleteStory = () => {
  const favoritesClient = useMemo(
    () => createMockFavoritesClient(['dashboard-001', 'dashboard-003', 'dashboard-007']),
    []
  );

  const dataSource = useMemo(
    () => ({
      debounceMs: 0,
      findItems: createMockStoryFindItems({
        items: decorateAsManaged(MOCK_DASHBOARDS),
        favoritesClient,
      }),
    }),
    [favoritesClient]
  );

  const features = useMemo(
    () => ({
      sorting: {
        initialSort: { field: 'updatedAt', direction: 'desc' as const },
        fields: [
          { field: 'title', name: 'Name' },
          { field: 'updatedAt', name: 'Last updated' },
        ],
      },
      pagination: { initialPageSize: 20 },
      tags: createMockTagFacetProvider(MOCK_DASHBOARDS),
      starred: true as const,
      userProfiles: createMockUserProfileFacetProvider(MOCK_DASHBOARDS),
      // Selection enabled so the toolbar's bulk-delete button appears.
      selection: true,
    }),
    []
  );

  const item = useMemo(
    () => ({
      getHref: (content: ContentListItem) => `#/dashboard/${content.id}`,
      // Handlers and restrictions declared once on the provider.
      actions: {
        edit: { onItemAction: () => undefined, restriction: restrictManagedEdit },
        delete: {
          onBulkAction: async () => {
            await wait(250);
          },
          restriction: restrictManagedDelete,
        },
      },
    }),
    []
  );

  const pageElement = useMemo(
    () => (
      <KibanaContentListPage>
        <KibanaContentListPage.Header
          title="Dashboards"
          tabs={[{ label: 'Dashboards', isSelected: true, onClick: () => undefined }]}
        />
        <Section>
          <ContentList emptyState={<DashboardListingEmptyPromptMock />}>
            <ContentListToolbar>
              <Filters>
                <Filters.Starred />
                <Filters.Tags />
                <Filters.CreatedBy />
                <Filters.Sort />
              </Filters>
            </ContentListToolbar>
            <ContentListTable title="Dashboards">
              <Column.Name showDescription showTags showStarred />
              <Column.CreatedBy />
              <Column.UpdatedAt />
              {/* Actions column default-infers Edit/Delete from itemConfig. */}
              <Column.Actions />
            </ContentListTable>
            <ContentListFooter />
          </ContentList>
        </Section>
      </KibanaContentListPage>
    ),
    []
  );

  return (
    <ContentListProvider
      id="dashboard-listing-bulk-delete-partition"
      labels={labels}
      services={{
        favorites: favoritesClient,
        tags: mockTagsService,
        userProfiles: mockContentListUserProfilesServices,
      }}
      dataSource={dataSource}
      features={features}
      item={item}
    >
      {pageElement}
      <EuiSpacer size="m" />
      <StateDiagnosticPanel element={pageElement} />
    </ContentListProvider>
  );
};

export const Original: StoryObj = {
  render: () => <OriginalStory />,
};

export const Proposal: StoryObj = {
  render: () => <ProposalStory />,
};

/**
 * Demonstrates the bulk-delete partition policy.
 *
 * - Selection checkboxes on managed rows are disabled with a tooltip.
 * - Row-level Delete and Edit icons on managed rows are disabled.
 * - The toolbar "Delete N dashboards" button is never disabled per-selection.
 */
export const BulkDeletePartition: StoryObj = {
  render: () => <BulkDeleteStory />,
};
