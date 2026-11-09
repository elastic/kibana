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
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
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
import {
  ContentListClientProvider,
  createFilterControl,
  defineContentListFilter,
  defineContentListSortField,
  useRecentlyAccessedDecoration,
  type ContentListClientProviderProps,
  type TableListViewFindItemsFn,
} from '@kbn/content-list-provider-client';
import { KibanaContentListPage } from '@kbn/content-list-page';
import {
  type DashboardMockItem,
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

type TimeRestoreFilterValue = 'restoresTime' | 'usesGlobalTime';

const getTimeRestoreValue = (item: DashboardMockItem): TimeRestoreFilterValue =>
  item.attributes.timeRestore ? 'restoresTime' : 'usesGlobalTime';

const timeRestoreFilter = defineContentListFilter<DashboardMockItem, TimeRestoreFilterValue>({
  id: 'timeRestore',
  title: 'Time behavior',
  getItemValue: getTimeRestoreValue,
  options: [
    { value: 'restoresTime', label: 'Restores time range' },
    { value: 'usesGlobalTime', label: 'Uses global time' },
  ],
});

// Registering the dimension above powers KQL search + facet counts; the toolbar
// control is placed explicitly below.
const TimeRestoreFilter = createFilterControl(timeRestoreFilter, {
  'data-test-subj': 'contentListTimeRestoreFilter',
});

const timeRestoreSort = defineContentListSortField<DashboardMockItem>({
  id: 'timeRestore',
  title: 'Time behavior',
  getValue: getTimeRestoreValue,
});

const clientProviderFeatures = {
  sorting: {
    initialSort: { field: 'updatedAt', direction: 'desc' },
    fields: (defaults) => ({
      ...defaults,
      timeRestore: timeRestoreSort,
    }),
  },
  pagination: { initialPageSize: 20 },
  filters: (defaults) => ({
    ...defaults,
    timeRestore: timeRestoreFilter,
  }),
} satisfies ContentListClientProviderProps['features'];

const clientStoryCore = {
  analytics: { reportEvent: () => undefined },
  i18n: {},
  theme: { theme$: {} },
  userProfile: { bulkGet: async () => [] },
  overlays: {
    openSystemFlyout: () => ({
      onClose: Promise.resolve(),
      close: async () => undefined,
    }),
  },
  notifications: {
    toasts: {
      addDanger: () => undefined,
    },
  },
  rendering: {
    addContext: (element: React.ReactNode) => <>{element}</>,
  },
  uiSettings: {
    get: <T,>(key: string): T => (key === 'savedObjects:listingLimit' ? 1000 : 20) as T,
  },
} as unknown as ContentListClientProviderProps['core'];

const findDashboardItems: TableListViewFindItemsFn = async (searchQuery, options, signal) => {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const matchingItems = normalizedSearch
    ? MOCK_DASHBOARDS.filter((dashboard) =>
        [dashboard.attributes.title, dashboard.attributes.description]
          .filter((text): text is string => Boolean(text))
          .some((text) => text.toLowerCase().includes(normalizedSearch))
      )
    : MOCK_DASHBOARDS;
  const limitedItems = matchingItems.slice(0, options?.listingLimit ?? matchingItems.length);

  return {
    hits: limitedItems,
    total: matchingItems.length,
  };
};

const TimeBehaviorBadge = ({ restoresTime }: { restoresTime: boolean }) => (
  <EuiBadge color={restoresTime ? 'primary' : 'hollow'}>
    {restoresTime ? 'Restores time range' : 'Uses global time'}
  </EuiBadge>
);

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
            <EuiButton fill iconType="plusCircle">
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

/**
 * Mutable in-memory stand-in for `getDashboardRecentlyAccessedService()`.
 * `get()` returns entries most recent first, like `RecentlyAccessed.get()`.
 */
const createMockHistory = (initialIds: string[]) => {
  let ids = initialIds;
  return {
    get: () => ids.map((id) => ({ id })),
    view: (id: string) => {
      ids = [id, ...ids.filter((existing) => existing !== id)];
    },
    clear: () => {
      ids = [];
    },
  };
};
type MockHistory = ReturnType<typeof createMockHistory>;

const ClientProviderExtensionsList = ({ history }: { history: MockHistory }) => {
  const recents = useRecentlyAccessedDecoration(history);

  const findItems = useMemo<TableListViewFindItemsFn>(
    () => async (searchQuery, options, signal) =>
      recents.decorate(await findDashboardItems(searchQuery, options, signal)),
    [recents]
  );

  const features = useMemo(
    () =>
      ({
        ...clientProviderFeatures,
        sorting: {
          ...clientProviderFeatures.sorting,
          initialSort: recents.initialSort ?? clientProviderFeatures.sorting.initialSort,
          fields: (defaults) => ({
            ...clientProviderFeatures.sorting.fields(defaults),
            ...recents.sortFields,
          }),
        },
      } satisfies ContentListClientProviderProps['features']),
    [recents]
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
                <Filters.Tags />
                <Filters.CreatedBy />
                <TimeRestoreFilter />
                <Filters.Sort />
              </Filters>
            </ContentListToolbar>
            <ContentListTable title="Dashboards">
              <Column.Name showDescription showTags />
              <Column
                id="timeRestore"
                name="Time behavior"
                sortable
                width="180px"
                render={(item) => <TimeBehaviorBadge restoresTime={Boolean(item.timeRestore)} />}
              />
              <Column.CreatedBy />
              <Column.UpdatedAt />
            </ContentListTable>
            <ContentListFooter />
          </ContentList>
        </Section>
      </KibanaContentListPage>
    ),
    []
  );

  return (
    <ContentListClientProvider
      id="dashboard-listing-client-provider-extensions"
      labels={labels}
      core={clientStoryCore}
      services={{
        tags: mockTagsService,
        userProfiles: mockContentListUserProfilesServices,
      }}
      features={features}
      findItems={findItems}
    >
      {pageElement}
      <EuiSpacer size="m" />
      <StateDiagnosticPanel element={pageElement} />
    </ContentListClientProvider>
  );
};

const ClientProviderExtensionsStory = () => {
  const history = useMemo(
    () => createMockHistory(['dashboard-005', 'dashboard-002', 'dashboard-007']),
    []
  );
  const [listKey, setListKey] = useState(0);
  const [dashboardToView, setDashboardToView] = useState(MOCK_DASHBOARDS[0].id);
  const dashboardOptions = useMemo(
    () => MOCK_DASHBOARDS.map(({ id, attributes }) => ({ value: id, text: attributes.title })),
    []
  );
  const titleById = useMemo(
    () => new Map(MOCK_DASHBOARDS.map(({ id, attributes }) => [id, attributes.title])),
    []
  );
  // Dashboards are recorded when viewed and the listing re-reads the history when it
  // mounts again, so remounting the list mirrors "open a dashboard, then come back".
  const updateHistory = (update: () => void) => {
    update();
    setListKey((key) => key + 1);
  };
  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiSelect
            compressed
            aria-label="Dashboard to view"
            options={dashboardOptions}
            value={dashboardToView}
            onChange={(event) => setDashboardToView(event.target.value)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={() => updateHistory(() => history.view(dashboardToView))}>
            View dashboard
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" color="text" onClick={() => updateHistory(() => history.clear())}>
            Clear history
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="xs">
        <p>History (most recent first):</p>
        {history.get().length > 0 ? (
          <ol>
            {history.get().map(({ id }) => (
              <li key={id}>{titleById.get(id) ?? id}</li>
            ))}
          </ol>
        ) : (
          <p>Empty</p>
        )}
      </EuiText>
      <EuiSpacer size="m" />
      <ClientProviderExtensionsList key={listKey} history={history} />
    </>
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

export const ClientProviderExtensions: StoryObj = {
  render: () => <ClientProviderExtensionsStory />,
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
