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
            <Column.Name showDescription showTags showStarred width="56%" />
            <Column.CreatedBy width="180px" />
            <Column.UpdatedAt width="160px" />
            <Column.Actions width="96px">
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
              <Column.Name showDescription showTags showStarred width="56%" />
              <Column.CreatedBy width="180px" />
              <Column.UpdatedAt width="160px" />
              <Column.Actions width="128px">
                <Action.Inspect />
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

export const Original: StoryObj = {
  render: () => <OriginalStory />,
};

export const Proposal: StoryObj = {
  render: () => <ProposalStory />,
};
