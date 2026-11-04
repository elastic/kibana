/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiErrorBoundary } from '@elastic/eui';
import { AppHeader, type AppHeaderTab } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import {
  ContentList,
  ContentListFooter,
  ContentListProvider,
  ContentListTable,
  ContentListToolbar,
  type ContentListProviderProps,
} from '@kbn/content-list';
import { KibanaContentListPage, type KibanaContentListPageTab } from '@kbn/content-list-page';
import { MOCK_DASHBOARDS, MOCK_VISUALIZATIONS } from '@kbn/content-list-mock-data';
import { createMockStoryFindItems } from './stories_helpers';

const meta: Meta = {
  title: 'Content List/Tabbed Listing',
};

export default meta;

const ASYNC_TAB_DELAY_MS = 1500;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type MockContentListProps = Pick<ContentListProviderProps, 'labels' | 'dataSource'> & {
  id: string;
  title: string;
};

const MockContentList = ({ id, title, labels, dataSource }: MockContentListProps) => (
  <ContentListProvider id={id} labels={labels} dataSource={dataSource}>
    <ContentList>
      <ContentListToolbar />
      <ContentListTable title={title} />
      <ContentListFooter />
    </ContentList>
  </ContentListProvider>
);

type TabDefinition = KibanaContentListPageTab & Pick<AppHeaderTab, 'label'>;

const TABS = [
  {
    id: 'dashboards',
    label: 'Dashboards',
    render: () => (
      <MockContentList
        id="tabbed-listing-dashboards"
        title="Dashboards"
        labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
        dataSource={{
          debounceMs: 0,
          findItems: createMockStoryFindItems({ items: MOCK_DASHBOARDS }),
        }}
      />
    ),
  },
  {
    id: 'visualizations',
    label: 'Visualizations',
    load: async () => {
      await wait(ASYNC_TAB_DELAY_MS);
      return (
        <MockContentList
          id="tabbed-listing-visualizations"
          title="Visualizations"
          labels={{ entity: 'visualization', entityPlural: 'visualizations' }}
          dataSource={{
            debounceMs: 0,
            findItems: createMockStoryFindItems({ items: MOCK_VISUALIZATIONS }),
          }}
        />
      );
    },
  },
  {
    id: 'failing',
    label: 'Failing tab',
    load: async () => {
      await wait(ASYNC_TAB_DELAY_MS);
      throw new Error('The tab content failed to load.');
    },
  },
] as const satisfies readonly TabDefinition[];

type TabId = (typeof TABS)[number]['id'];

const TabbedListingStory = () => {
  const [activeTabId, setActiveTabId] = useState<TabId>('dashboards');

  const headerTabs = useMemo<AppHeaderTab[]>(
    () =>
      TABS.map(({ id, label }) => ({
        id,
        label,
        isSelected: id === activeTabId,
        onClick: () => setActiveTabId(id),
      })),
    [activeTabId]
  );

  return (
    <MockAppHeaderProvider>
      <AppHeader title="Dashboards" tabs={headerTabs} />
      <KibanaContentListPage>
        <KibanaContentListPage.Section aria-label="Dashboards">
          <EuiErrorBoundary key={activeTabId}>
            <KibanaContentListPage.ActiveTab tabs={TABS} activeTabId={activeTabId} />
          </EuiErrorBoundary>
        </KibanaContentListPage.Section>
      </KibanaContentListPage>
    </MockAppHeaderProvider>
  );
};

export const TabbedListing: StoryObj = {
  render: () => <TabbedListingStory />,
};
