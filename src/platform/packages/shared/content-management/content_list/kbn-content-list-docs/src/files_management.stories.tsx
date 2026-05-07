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
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import {
  ContentList,
  ContentListProvider,
  ContentListTable,
  ContentListFooter,
  ContentListToolbar,
} from '@kbn/content-list';
import { KibanaContentListPage } from '@kbn/content-list-page';
import { MOCK_FILES } from '@kbn/content-list-mock-data';
import {
  ListingPageHeaderMock,
  StateDiagnosticPanel,
  createMockStoryFindItems,
  useInspectFlyout,
} from './stories_helpers';

const meta: Meta = {
  title: 'Content List/Files Management',
};

export default meta;

const { Column, Action } = ContentListTable;
const { Filters } = ContentListToolbar;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const formatBytes = (bytes?: number) => {
  if (bytes == null) {
    return '—';
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
};

const labels = {
  entity: 'file',
  entityPlural: 'files',
} as const;

const emptyState = (
  <EuiEmptyPrompt
    title={<h3>No files found</h3>}
    body={<p>Any files created in Kibana will be listed here.</p>}
  />
);

const useFilesProviderProps = (onInspect?: (item: ContentListItem) => void) => {
  const dataSource = useMemo(
    () => ({
      debounceMs: 0,
      findItems: createMockStoryFindItems({
        items: MOCK_FILES,
        extraFields: (item) => ({
          size: item.attributes.size,
          fileKind: item.attributes.fileKind,
          extension: item.attributes.extension,
          mimeType: item.attributes.mimeType,
        }),
      }),
    }),
    []
  );

  const features = useMemo(
    () => ({
      sorting: {
        initialSort: { field: 'title', direction: 'asc' as const },
        fields: [
          { field: 'title', name: 'Name' },
          { field: 'size', name: 'Size' },
        ],
      },
      pagination: { initialPageSize: 50 },
    }),
    []
  );

  const item = useMemo(
    () => ({
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
  const { onInspect, flyout } = useInspectFlyout();
  const providerProps = useFilesProviderProps(onInspect);

  const pageElement = useMemo(
    () => (
      <>
        <ListingPageHeaderMock
          title="Files"
          description="Manage files stored in Kibana."
          actions={
            <EuiButtonEmpty iconType="visTable" size="s">
              Statistics
            </EuiButtonEmpty>
          }
        />
        <ContentList emptyState={emptyState}>
          <ContentListToolbar />
          <ContentListTable title="Files">
            <Column
              id="title"
              name="Name"
              field="title"
              width="62%"
              sortable
              render={(item) => (
                <>
                  <EuiLink onClick={() => onInspect(item)}>{item.title}</EuiLink>
                  {item.description ? (
                    <EuiText size="s" color="subdued">
                      <p>{item.description}</p>
                    </EuiText>
                  ) : null}
                </>
              )}
            />
            <Column
              id="size"
              name="Size"
              field="size"
              width="120px"
              sortable
              render={(item) => {
                const size = item.size == null ? undefined : Number(item.size);
                return formatBytes(size !== undefined && Number.isFinite(size) ? size : undefined);
              }}
            />
            <Column.Actions width="96px">
              <Action.Delete />
            </Column.Actions>
          </ContentListTable>
          <ContentListFooter />
        </ContentList>
        {flyout}
      </>
    ),
    [flyout, onInspect]
  );

  return (
    <EuiPanel paddingSize="l">
      <ContentListProvider id="files-management-original" labels={labels} {...providerProps}>
        {pageElement}
        <EuiSpacer size="m" />
        <StateDiagnosticPanel element={pageElement} />
      </ContentListProvider>
    </EuiPanel>
  );
};

const ProposalStory = () => {
  const { onInspect, flyout } = useInspectFlyout();
  const providerProps = useFilesProviderProps(onInspect);

  const pageElement = useMemo(
    () => (
      <KibanaContentListPage>
        <KibanaContentListPage.Header
          title="Files"
          description="Manage files stored in Kibana."
          actions={
            <EuiButtonEmpty iconType="visTable" size="s">
              Statistics
            </EuiButtonEmpty>
          }
        />
        <KibanaContentListPage.Section>
          <ContentList emptyState={emptyState}>
            <ContentListToolbar>
              <Filters>
                <Filters.Sort />
              </Filters>
            </ContentListToolbar>
            <ContentListTable title="Files">
              <Column.Name showDescription width="44%" />
              <Column
                id="fileKind"
                name="Type"
                field="fileKind"
                width="140px"
                sortable
                render={(item) => (
                  <EuiBadge color="hollow">{String(item.fileKind ?? 'general')}</EuiBadge>
                )}
              />
              <Column
                id="size"
                name="Size"
                field="size"
                width="120px"
                sortable
                render={(item) => {
                  const size = item.size == null ? undefined : Number(item.size);
                  return formatBytes(
                    size !== undefined && Number.isFinite(size) ? size : undefined
                  );
                }}
              />
              <Column.UpdatedAt width="160px" />
              <Column.Actions width="128px">
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
    <ContentListProvider id="files-management-proposal" labels={labels} {...providerProps}>
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
