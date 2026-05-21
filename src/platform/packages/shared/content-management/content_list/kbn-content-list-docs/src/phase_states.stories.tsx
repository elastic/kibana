/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import {
  ContentList,
  ContentListProvider,
  ContentListTable,
  ContentListFooter,
  ContentListToolbar,
  useContentListPhase,
  useContentListSearch,
  type ContentListItem,
  type FindItemsParams,
  type FindItemsResult,
} from '@kbn/content-list';
import { DashboardListingEmptyPromptMock, DashboardListingStoryFrame } from './stories_helpers';

const meta: Meta = {
  title: 'Content List/Phase States',
};

export default meta;

type PhaseStoryState = 'initialLoad' | 'empty' | 'filtering' | 'filtered' | 'populated';

const { Column } = ContentListTable;

const sampleItems: ContentListItem[] = [
  {
    id: 'dashboard-1',
    title: 'Revenue overview',
    description: 'Executive dashboard for quarterly revenue.',
    type: 'dashboard',
    updatedAt: new Date('2025-01-15T12:00:00Z'),
  },
  {
    id: 'dashboard-2',
    title: 'Usage health',
    description: 'Adoption and retention signals by cohort.',
    type: 'dashboard',
    updatedAt: new Date('2025-01-14T12:00:00Z'),
  },
  {
    id: 'dashboard-3',
    title: 'Operations watch',
    description: 'Service health and alert follow-up.',
    type: 'dashboard',
    updatedAt: new Date('2025-01-13T12:00:00Z'),
  },
];

const features = {
  sorting: {
    initialSort: { field: 'title', direction: 'asc' as const },
    fields: [
      { field: 'title', name: 'Name' },
      { field: 'updatedAt', name: 'Last updated' },
    ],
  },
  pagination: { initialPageSize: 5 },
};

const labels = {
  entity: 'dashboard',
  entityPlural: 'dashboards',
};

const createFindItems = (state: PhaseStoryState) => {
  return async ({ searchQuery }: FindItemsParams): Promise<FindItemsResult> => {
    if (state === 'initialLoad') {
      return new Promise<FindItemsResult>(() => undefined);
    }

    if (state === 'empty') {
      return { items: [], total: 0 };
    }

    if (state === 'filtered') {
      return { items: [], total: 0 };
    }

    if (state === 'filtering' && searchQuery.length > 0) {
      return new Promise<FindItemsResult>(() => undefined);
    }

    return { items: sampleItems, total: sampleItems.length };
  };
};

const PhaseLabel = () => {
  const phase = useContentListPhase();
  return (
    <EuiCallOut
      size="s"
      color="primary"
      title={`Current phase: ${phase}`}
      data-test-subj="content-list-phase-story-current-phase"
    />
  );
};

const StartFiltering = () => {
  const phase = useContentListPhase();
  const { setQueryFromText } = useContentListSearch();

  useEffect(() => {
    if (phase === 'populated') {
      setQueryFromText('pending fetch');
    }
  }, [phase, setQueryFromText]);

  return null;
};

const StateStory = ({
  state,
  customEmptyState = false,
  customSection = false,
}: {
  state: PhaseStoryState;
  customEmptyState?: boolean;
  customSection?: boolean;
}) => {
  const dataSource = useMemo(
    () => ({
      findItems: createFindItems(state),
      debounceMs: 0,
    }),
    [state]
  );

  const providerFeatures = useMemo(
    () => ({
      ...features,
      search: state === 'filtered' ? { initialSearch: 'no matching dashboard' } : true,
    }),
    [state]
  );

  return (
    <DashboardListingStoryFrame>
      <ContentListProvider
        id={`phase-state-${state}${customSection ? '-custom-section' : ''}`}
        labels={labels}
        dataSource={dataSource}
        features={providerFeatures}
      >
        {state === 'filtering' && <StartFiltering />}
        <PhaseLabel />
        <ContentList
          {...(customEmptyState
            ? {
                emptyState: <DashboardListingEmptyPromptMock />,
              }
            : {})}
        >
          <ContentListToolbar />
          {customSection && (
            <EuiCallOut
              announceOnMount={false}
              size="s"
              color="success"
              title="Custom interspersed section"
              data-test-subj="content-list-phase-story-custom-section"
            />
          )}
          <ContentListTable title="Dashboards" tableLayout="fixed">
            <Column.Name width="65%" />
            <Column.UpdatedAt width="160px" />
          </ContentListTable>
          <ContentListFooter />
        </ContentList>
        <EuiSpacer size="m" />
      </ContentListProvider>
    </DashboardListingStoryFrame>
  );
};

export const InitialLoad: StoryObj = {
  name: 'Initial load',
  render: () => <StateStory state="initialLoad" />,
};

export const Empty: StoryObj = {
  name: 'Empty',
  render: () => <StateStory state="empty" />,
};

export const CustomEmptyState: StoryObj = {
  name: 'Custom empty state',
  render: () => <StateStory state="empty" customEmptyState />,
};

export const Filtering: StoryObj = {
  name: 'Filtering',
  render: () => <StateStory state="filtering" />,
};

export const Filtered: StoryObj = {
  name: 'Filtered',
  render: () => <StateStory state="filtered" />,
};

export const Populated: StoryObj = {
  name: 'Populated',
  render: () => <StateStory state="populated" />,
};

export const InterspersedCustomSection: StoryObj = {
  name: 'Interspersed custom section',
  render: () => <StateStory state="populated" customSection />,
};
