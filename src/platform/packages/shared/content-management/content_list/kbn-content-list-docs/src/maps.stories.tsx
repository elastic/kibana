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
  MOCK_MAPS,
  mockContentListUserProfilesServices,
  mockTagsService,
} from '@kbn/content-list-mock-data';
import {
  StateDiagnosticPanel,
  createMockStoryFindItems,
  createMockTagFacetProvider,
  createMockUserProfileFacetProvider,
  useInspectFlyout,
} from './stories_helpers';

const meta: Meta = {
  title: 'Content List/Maps',
};

export default meta;

const { Column, Action } = ContentListTable;
const { Filters } = ContentListToolbar;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const labels = {
  entity: 'map',
  entityPlural: 'maps',
} as const;

const useMapsProviderProps = ({
  onInspect,
  includeCreatedBy = false,
}: {
  onInspect?: (item: ContentListItem) => void;
  includeCreatedBy?: boolean;
}) => {
  const dataSource = useMemo(
    () => ({
      debounceMs: 0,
      findItems: createMockStoryFindItems({ items: MOCK_MAPS }),
    }),
    []
  );

  const features = useMemo(
    () => ({
      sorting: {
        initialSort: { field: 'title', direction: 'asc' as const },
        fields: [
          { field: 'title', name: 'Name' },
          { field: 'updatedAt', name: 'Last updated' },
        ],
      },
      pagination: { initialPageSize: 20 },
      tags: createMockTagFacetProvider(MOCK_MAPS),
      ...(includeCreatedBy ? { userProfiles: createMockUserProfileFacetProvider(MOCK_MAPS) } : {}),
    }),
    [includeCreatedBy]
  );

  const item = useMemo(
    () => ({
      getHref: (content: ContentListItem) => `#/maps/map/${content.id}`,
      onDelete: async () => {
        await wait(250);
      },
      ...(onInspect ? { onInspect } : {}),
    }),
    [onInspect]
  );

  return { dataSource, features, item };
};

const OriginalStory = () => {
  const providerProps = useMapsProviderProps({});

  const pageElement = useMemo(
    () => (
      <KibanaContentListPage>
        <KibanaContentListPage.Header
          title="Maps"
          actions={
            <EuiButton fill iconType="plusInCircle">
              Create map
            </EuiButton>
          }
        />
        <KibanaContentListPage.Section>
          <ContentList>
            <ContentListToolbar>
              <Filters>
                <Filters.Tags />
              </Filters>
            </ContentListToolbar>
            <ContentListTable title="Maps">
              <Column.Name showDescription showTags />
              <Column.UpdatedAt />
              <Column.Actions>
                <Action.Delete />
              </Column.Actions>
            </ContentListTable>
            <ContentListFooter />
          </ContentList>
        </KibanaContentListPage.Section>
      </KibanaContentListPage>
    ),
    []
  );

  return (
    <ContentListProvider
      id="maps-original"
      labels={labels}
      services={{ tags: mockTagsService }}
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
  const providerProps = useMapsProviderProps({ onInspect, includeCreatedBy: true });

  const pageElement = useMemo(
    () => (
      <KibanaContentListPage>
        <KibanaContentListPage.Header
          title="Maps"
          actions={
            <EuiButton fill iconType="plusInCircle">
              Create map
            </EuiButton>
          }
        />
        <KibanaContentListPage.Section>
          <ContentList>
            <ContentListToolbar>
              <Filters>
                <Filters.Tags />
                <Filters.CreatedBy />
                <Filters.Sort />
              </Filters>
            </ContentListToolbar>
            <ContentListTable title="Maps">
              <Column.Name showDescription showTags />
              <Column.CreatedBy />
              <Column.UpdatedAt />
              <Column.Actions>
                <Action.Inspect />
                <Action.Delete />
              </Column.Actions>
            </ContentListTable>
            <ContentListFooter />
            {flyout}
          </ContentList>
        </KibanaContentListPage.Section>
      </KibanaContentListPage>
    ),
    [flyout]
  );

  return (
    <ContentListProvider
      id="maps-proposal"
      labels={labels}
      services={{ tags: mockTagsService, userProfiles: mockContentListUserProfilesServices }}
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
