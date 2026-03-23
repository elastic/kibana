/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  TableListTab,
  TableListTabParentProps,
} from '@kbn/content-management-tabbed-table-list-view';
import {
  ContentListClientProvider,
  type ContentListClientServices,
} from '@kbn/content-list-provider-client';
import type { ContentListItem, DataSourceConfig } from '@kbn/content-list-provider';
import { ContentListTable } from '@kbn/content-list-table';
import { ContentListToolbar } from '@kbn/content-list-toolbar';
import { ContentListFooter } from '@kbn/content-list-footer';
import type { ContentManagementTagsServices } from '@kbn/content-management-tags';
import { FavoritesClient } from '@kbn/content-management-favorites-public';
import type { UserProfileAvatarData } from '@kbn/user-profile-components';
import { DASHBOARD_APP_ID } from '../../common/page_bundle_constants';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../common/constants';
import {
  coreServices,
  savedObjectsTaggingService,
  usageCollectionService,
} from '../services/kibana_services';
import { DashboardUnsavedListing } from './dashboard_unsaved_listing';
import { useDashboardListingTable } from './hooks/use_dashboard_listing_table';
import type { DashboardListingProps, DashboardSavedObjectUserContent } from './types';

type GetDashboardListingTabsParams = Pick<
  DashboardListingProps,
  'goToDashboard' | 'getDashboardUrl' | 'useSessionStorageIntegration' | 'initialFilter' | 'getTabs'
>;

type ContentListTabContentProps = Omit<GetDashboardListingTabsParams, 'getTabs'> & {
  parentProps: TableListTabParentProps<DashboardSavedObjectUserContent>;
};

/**
 * Build {@link ContentListClientServices} from the Kibana core and plugin services.
 */
const buildContentListServices = (
  dashboardFavoritesClient: FavoritesClient
): ContentListClientServices => {
  const taggingApi = savedObjectsTaggingService?.getTaggingApi();

  const tags: ContentManagementTagsServices | undefined = taggingApi
    ? { getTagList: () => taggingApi.ui.getTagList() }
    : undefined;

  return {
    uiSettings: coreServices.uiSettings,
    tags,
    favorites: dashboardFavoritesClient,
    userProfiles: {
      bulkResolve: async (uids) => {
        if (uids.length === 0) {
          return [];
        }
        const profiles = await coreServices.userProfile.bulkGet<{
          avatar?: UserProfileAvatarData;
        }>({
          uids: new Set(uids),
          dataPath: 'avatar',
        });
        return profiles.map((p) => ({
          uid: p.uid,
          user: p.user,
          avatar: p.data.avatar,
          email: p.user.email ?? '',
          fullName: p.user.full_name ?? p.user.username,
        }));
      },
    },
  };
};

const { Column, Action } = ContentListTable;
const { Filters } = ContentListToolbar;

/**
 * Content List-based dashboard tab content.
 *
 * This replaces the `TableListViewTable`-based version to verify that the
 * content-list packages work end-to-end with the Dashboard's real data.
 *
 * Known gaps (require new content-list package features):
 *
 * TODO: Custom empty-state / create CTA — `useDashboardListingTable` provides
 * `createItem` and `DashboardListingEmptyPrompt` but the content-list packages
 * have no custom empty-state slot yet. On an empty dashboard list the generic
 * "No items" state renders instead of the "Create your first dashboard" prompt.
 *
 * TODO: "Recently viewed" sort — the old `TableListViewTable` path detects
 * `recentlyAccessed`, pre-sorts hits by local browser history, and exposes a
 * dedicated sort option. The content-list sort config currently only supports
 * static field-based sorts, so this mode is missing.
 *
 * TODO: Content-editor / details flyout — the old path passes `contentEditor`
 * (with `onSave` and `customValidators`) into `TableListViewTable` to enable
 * inline title/description/tag editing. The content-list packages do not yet
 * have a flyout integration point.
 */
const DashboardsContentListTabContent = ({
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
  initialFilter,
  parentProps,
}: ContentListTabContentProps) => {
  const { unsavedDashboardIds, refreshUnsavedDashboards, tableListViewTableProps } =
    useDashboardListingTable({
      goToDashboard,
      getDashboardUrl,
      useSessionStorageIntegration,
      initialFilter,
    });

  // Forward tab-container callbacks so the parent receives fetch-completion
  // and page test-subject updates.
  const { onFetchSuccess: parentOnFetchSuccess, setPageDataTestSubject } = parentProps;

  // Combine the hook's onFetchSuccess with the parent's callback into a
  // single DataSourceConfig.onFetchSuccess so both fire after each fetch.
  const onFetchSuccess: DataSourceConfig['onFetchSuccess'] = useCallback(() => {
    tableListViewTableProps.onFetchSuccess?.();
    parentOnFetchSuccess?.();
  }, [tableListViewTableProps, parentOnFetchSuccess]);

  // Set the page data-test-subj for the tab container.
  useEffect(() => {
    setPageDataTestSubject?.('dashboardLandingPage');
  }, [setPageDataTestSubject]);

  const dashboardFavoritesClient = useMemo(
    () =>
      new FavoritesClient(DASHBOARD_APP_ID, DASHBOARD_SAVED_OBJECT_TYPE, {
        http: coreServices.http,
        usageCollection: usageCollectionService,
        userProfile: coreServices.userProfile,
      }),
    []
  );

  const services = useMemo(
    () => buildContentListServices(dashboardFavoritesClient),
    [dashboardFavoritesClient]
  );

  const getHref = useCallback(
    (item: ContentListItem) =>
      getDashboardUrl(item.id, Boolean((item as Record<string, unknown>).timeRestore)),
    [getDashboardUrl]
  );

  const onEdit = useCallback(
    (item: ContentListItem) => goToDashboard(item.id, 'edit'),
    [goToDashboard]
  );

  const onDelete = useCallback(
    async (items: ContentListItem[]) => {
      if (tableListViewTableProps.deleteItems) {
        // The implementation only uses `id`; the wider type is a `TableListViewTableProps` artifact.
        await tableListViewTableProps.deleteItems(
          items.map(({ id }) => ({ id })) as DashboardSavedObjectUserContent[]
        );
      }
    },
    [tableListViewTableProps]
  );

  // Per-item guard for edit/delete actions. Mirrors the `rowItemActions`
  // logic from `useDashboardListingTable`: managed dashboards and
  // write-restricted dashboards that the current user cannot manage are
  // not editable or deletable.
  const isItemEditable = useCallback((listItem: ContentListItem) => {
    const raw = listItem as Record<string, unknown>;
    if (raw.managed === true) {
      return false;
    }
    if (raw.canManageAccessControl === false && raw.accessMode === 'write_restricted') {
      return false;
    }
    return true;
  }, []);

  const item = useMemo(
    () => ({
      getHref,
      onEdit,
      onDelete: tableListViewTableProps.deleteItems ? onDelete : undefined,
    }),
    [getHref, onEdit, onDelete, tableListViewTableProps.deleteItems]
  );

  return (
    <ContentListClientProvider
      id="dashboard"
      labels={{
        entity: tableListViewTableProps.entityName,
        entityPlural: tableListViewTableProps.entityNamePlural,
      }}
      findItems={tableListViewTableProps.findItems}
      onFetchSuccess={onFetchSuccess}
      services={services}
      item={item}
      features={{
        userProfiles: true,
        tags: true,
        starred: true,
      }}
    >
      <DashboardUnsavedListing
        goToDashboard={goToDashboard}
        unsavedDashboardIds={unsavedDashboardIds}
        refreshUnsavedDashboards={refreshUnsavedDashboards}
      />
      <ContentListToolbar>
        <Filters>
          <Filters.Starred />
          <Filters.Tags />
          <Filters.CreatedBy />
          <Filters.Sort />
        </Filters>
      </ContentListToolbar>
      <ContentListTable title={tableListViewTableProps.title}>
        <Column.Name showStarred />
        <Column.CreatedBy />
        <Column.UpdatedAt />
        <Column.Actions>
          <Action.Edit enabled={isItemEditable} />
          <Action.Delete enabled={isItemEditable} />
        </Column.Actions>
      </ContentListTable>
      <ContentListFooter />
    </ContentListClientProvider>
  );
};

export const getDashboardListingTabs = ({
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
  initialFilter,
  getTabs,
}: GetDashboardListingTabsParams): TableListTab<DashboardSavedObjectUserContent>[] => {
  const commonProps = {
    goToDashboard,
    getDashboardUrl,
    useSessionStorageIntegration,
    initialFilter,
  };

  const dashboardsTab: TableListTab<DashboardSavedObjectUserContent> = {
    title: i18n.translate('dashboard.listing.tabs.dashboards.title', {
      defaultMessage: 'Dashboards',
    }),
    id: 'dashboards',
    getTableList: (parentProps) => (
      <DashboardsContentListTabContent {...commonProps} parentProps={parentProps} />
    ),
  };

  // Additional tabs (e.g., visualizations and annotation groups)
  const additionalTabs = getTabs ? getTabs() : [];

  return [dashboardsTab, ...additionalTabs];
};
