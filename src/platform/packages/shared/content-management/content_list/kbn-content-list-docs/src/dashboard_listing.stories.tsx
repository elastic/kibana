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
  createClientStrategy,
  type TableListViewFindItemsFn,
} from '@kbn/content-list-provider-client';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
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
  useInspectFlyout,
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

/** Per-item gate: disable Edit for managed dashboards. */
const isItemEditable = (item: ContentListItem) => !item.managed;

/** Per-item disabled-reason for Edit; falls through to default description otherwise. */
const editDisabledReason = (item: ContentListItem) =>
  item.managed ? `'${item.title}' is managed by Elastic and cannot be edited.` : undefined;

/** Per-item gate: disable Delete for managed dashboards. */
const isItemDeletable = (item: ContentListItem) => !item.managed;

/** Per-item disabled-reason for Delete; falls through to default description otherwise. */
const deleteDisabledReason = (item: ContentListItem) =>
  item.managed ? `'${item.title}' is managed by Elastic and cannot be deleted.` : undefined;

const useDashboardProviderProps = ({
  onInspect,
  includeInspect = false,
}: {
  onInspect?: (item: ContentListItem) => void;
  includeInspect?: boolean;
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
    }),
    []
  );

  const item = useMemo(
    () => ({
      getHref: (content: ContentListItem) => `#/dashboard/${content.id}`,
      getEditUrl: (content: ContentListItem) => `#/dashboard/${content.id}?view=edit`,
      onDelete: async () => {
        await wait(250);
      },
      ...(includeInspect && onInspect ? { onInspect } : {}),
    }),
    [includeInspect, onInspect]
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
              <Action.Edit enabled={isItemEditable} disabledReason={editDisabledReason} />
              <Action.Delete enabled={isItemDeletable} disabledReason={deleteDisabledReason} />
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
  const { onInspect, flyout } = useInspectFlyout();
  const { favoritesClient, ...providerProps } = useDashboardProviderProps({
    onInspect,
    includeInspect: true,
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
                <Action.Inspect />
                <Action.Edit enabled={isItemEditable} disabledReason={editDisabledReason} />
                <Action.Delete enabled={isItemDeletable} disabledReason={deleteDisabledReason} />
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
// "Recently viewed" sort with `accessedAt` + `updatedAt desc` fallback
// =============================================================================

/**
 * Static recents fixture: a few dashboards have been opened recently and carry
 * a numeric `accessedAt`; the rest have never been opened. The strategy's
 * `accessedAt` sort places recents first (by `accessedAt desc`) and the rest
 * after, broken-tied by `updatedAt desc`.
 */
const RECENTLY_ACCESSED_AT: Record<string, number> = {
  'dashboard-001': 30,
  'dashboard-007': 20,
  'dashboard-003': 10,
};

const decorateWithAccessedAt = (items: typeof MOCK_DASHBOARDS): UserContentCommonSchema[] =>
  items.map((item) => {
    const accessedAt = RECENTLY_ACCESSED_AT[item.id];
    return accessedAt !== undefined ? { ...item, accessedAt } : item;
  });

const RecentlyViewedStory = () => {
  const favoritesClient = useMemo(
    () => createMockFavoritesClient(['dashboard-001', 'dashboard-003', 'dashboard-007']),
    []
  );

  // The strategy expects a legacy `TableListViewFindItemsFn` that returns
  // every matching hit; client-side filter / sort / page is all done by
  // `createClientStrategy`. Search is honoured here because the strategy
  // forwards `searchQuery` to the inner fetch.
  const findItemsLegacy = useMemo<TableListViewFindItemsFn>(() => {
    const allItems = decorateWithAccessedAt(MOCK_DASHBOARDS);
    return async (searchQuery) => {
      const query = searchQuery.trim().toLowerCase();
      const hits = query
        ? allItems.filter(
            (item) =>
              item.attributes.title?.toLowerCase().includes(query) ||
              item.attributes.description?.toLowerCase().includes(query)
          )
        : allItems;
      return { hits, total: hits.length };
    };
  }, []);

  const dataSource = useMemo(() => {
    const { findItems } = createClientStrategy(findItemsLegacy);
    return { debounceMs: 0, findItems };
  }, [findItemsLegacy]);

  const features = useMemo(
    () => ({
      sorting: {
        initialSort: { field: 'accessedAt', direction: 'desc' as const },
        fields: [
          { field: 'accessedAt', name: 'Recently viewed' },
          { field: 'title', name: 'Name' },
          { field: 'updatedAt', name: 'Last updated' },
        ],
      },
      pagination: { initialPageSize: 20 },
      tags: createMockTagFacetProvider(MOCK_DASHBOARDS),
      starred: true as const,
      userProfiles: createMockUserProfileFacetProvider(MOCK_DASHBOARDS),
    }),
    []
  );

  const item = useMemo(
    () => ({
      getHref: (content: ContentListItem) => `#/dashboard/${content.id}`,
      getEditUrl: (content: ContentListItem) => `#/dashboard/${content.id}?view=edit`,
      onDelete: async () => {
        await wait(250);
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
              <Column.Actions>
                <Action.Edit enabled={isItemEditable} disabledReason={editDisabledReason} />
                <Action.Delete enabled={isItemDeletable} disabledReason={deleteDisabledReason} />
              </Column.Actions>
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
      id="dashboard-listing-recently-viewed"
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
 * Demonstrates the `accessedAt` sort with a `updatedAt desc` fallback for
 * dashboards that have never been opened. Three dashboards carry a synthetic
 * `accessedAt` value and float to the top in order; the remaining items sort
 * by `updatedAt desc`. Switch the sort to "Name" or "Last updated" to confirm
 * normal sort still works on the same fixture.
 */
export const RecentlyViewed: StoryObj = {
  render: () => <RecentlyViewedStory />,
};
