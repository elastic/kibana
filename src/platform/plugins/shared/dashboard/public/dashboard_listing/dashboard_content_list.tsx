/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPageTemplate,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClientProvider } from '@kbn/react-query';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { FavoritesClient } from '@kbn/content-management-favorites-public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { ViewMode as PresentationViewMode } from '@kbn/presentation-publishing';
import {
  type ContentListItem,
  createActivityAppendRows,
  ContentEditorActionProvider,
} from '@kbn/content-list-provider';
import {
  ContentEditorKibanaProvider,
  type ContentEditorKibanaDependencies,
} from '@kbn/content-management-content-editor';
import { ContentListClientKibanaProvider } from '@kbn/content-list-provider-client';
import { ContentListServerKibanaProvider } from '@kbn/content-list-provider-server';
import { ContentListTable } from '@kbn/content-list-table';
import { ContentListToolbar } from '@kbn/content-list-toolbar';
import { ContentListGrid, ViewModeToggle, type ViewMode } from '@kbn/content-list-grid';

import { DASHBOARD_APP_ID } from '../../common/page_bundle_constants';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../common/constants';
import {
  coreServices,
  savedObjectsTaggingService,
  usageCollectionService,
  serverlessService,
} from '../services/kibana_services';
import { dashboardQueryClient } from '../services/dashboard_query_client';
import { getDashboardCapabilities } from '../utils/get_dashboard_capabilities';
import { dashboardListingTableStrings } from './_dashboard_listing_strings';
import { DashboardUnsavedListing } from './dashboard_unsaved_listing';
import { useDashboardListingTable } from './hooks/use_dashboard_listing_table';
import type { DashboardSavedObjectUserContent } from './types';
import { getDashboardListItemLink } from '../dashboard_app/listing_page/get_dashboard_list_item_link';

// =============================================================================
// Types
// =============================================================================

interface DashboardContentListProps {
  /** URL state storage for generating dashboard links with global state. */
  kbnUrlStateStorage: IKbnUrlStateStorage;
  /** Navigate to a dashboard. */
  goToDashboard: (dashboardId?: string, viewMode?: PresentationViewMode) => void;
  /** Generate dashboard URL for links. */
  getDashboardUrl: (dashboardId: string, usesTimeRestore: boolean) => string;
  /** Optional initial search filter. */
  initialFilter?: string;
  /** Enable session storage integration for unsaved changes. */
  useSessionStorageIntegration?: boolean;
  /** Disable the create dashboard button. */
  disableCreateDashboardButton?: boolean;
  /** Show/hide the create dashboard button. */
  showCreateDashboardButton?: boolean;
}

/**
 * Extended item type for use in item actions and rendering.
 */
interface DashboardItem extends ContentListItem {
  /** Whether the dashboard has time restore enabled. */
  timeRestore?: boolean;
  /** Dashboard access control permission. */
  canManageAccessControl?: boolean;
  /** Dashboard access mode. */
  accessMode?: string;
}

// =============================================================================
// Strings
// =============================================================================

const strings = {
  tableTitle: dashboardListingTableStrings.getTableListTitle(),
  entityName: dashboardListingTableStrings.getEntityName(),
  entityNamePlural: dashboardListingTableStrings.getEntityNamePlural(),
  pageTitle: i18n.translate('dashboard.contentList.pageTitle', {
    defaultMessage: 'Dashboards',
  }),
};

// =============================================================================
// Transform
// =============================================================================

/**
 * Transform function to convert `DashboardSavedObjectUserContent` to `DashboardItem`.
 * Preserves dashboard-specific attributes like `timeRestore` and access control.
 */
const dashboardTransform = (item: DashboardSavedObjectUserContent): DashboardItem => {
  return {
    id: item.id,
    title: item.attributes.title,
    description: item.attributes.description,
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
    updatedBy: item.updatedBy,
    createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
    createdBy: item.createdBy,
    isManaged: item.managed,
    canStar: item.managed ? false : undefined, // Managed dashboards cannot be starred.
    tags: item.references?.filter((ref) => ref.type === 'tag').map((ref) => ref.id) ?? [],
    // Dashboard-specific fields.
    timeRestore: item.attributes.timeRestore,
    canManageAccessControl: item.canManageAccessControl,
    accessMode: item.accessMode,
  };
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * Dashboard Content List - Prototype replacement for TableListViewTable.
 *
 * Uses the new Content List components with the existing `useDashboardListingTable` hook.
 * The `ContentListClientKibanaProvider` accepts the same `findItems` function that was
 * used with `TableListView`, making migration minimal.
 *
 * ## Features
 * - Reuses existing `useDashboardListingTable` hook for all dashboard-specific logic.
 * - Search via dashboard API with client-side sort, filter, and pagination.
 * - Tags filtering and display.
 * - Favorites support.
 * - User profile filtering (created by).
 * - Unsaved changes listing from session storage.
 * - Capability-based read-only mode.
 * - Content editor flyout for metadata editing.
 * - Activity/insights display in content editor.
 *
 * @example
 * ```tsx
 * <DashboardContentList
 *   kbnUrlStateStorage={kbnUrlStateStorage}
 *   goToDashboard={(id, viewMode) => redirectTo({ destination: 'dashboard', id, editMode: viewMode === 'edit' })}
 *   getDashboardUrl={(id, usesTimeRestore) => getDashboardUrl(id, usesTimeRestore)}
 *   useSessionStorageIntegration={true}
 * />
 * ```
 */
export const DashboardContentList = ({
  kbnUrlStateStorage,
  goToDashboard,
  getDashboardUrl,
  initialFilter,
  useSessionStorageIntegration = true,
  disableCreateDashboardButton,
  showCreateDashboardButton = true,
}: DashboardContentListProps) => {
  useExecutionContext(coreServices.executionContext, {
    type: 'application',
    page: 'list',
  });

  const { showWriteControls } = getDashboardCapabilities();

  // View mode state for table/grid toggle.
  const [listViewMode, setListViewMode] = useState<ViewMode>('table');

  // =========================================================================
  // Use the EXISTING hook - same one used with TableListView
  // =========================================================================

  const {
    unsavedDashboardIds,
    refreshUnsavedDashboards,
    tableListViewTableProps,
    contentInsightsClient,
  } = useDashboardListingTable({
    goToDashboard,
    getDashboardUrl,
    initialFilter,
    useSessionStorageIntegration,
    disableCreateDashboardButton,
    showCreateDashboardButton,
  });

  // Extract the findItems function - this is the key reuse from the existing hook.
  const { findItems, contentEditor, createItem, deleteItems, editItem } = tableListViewTableProps;

  // =========================================================================
  // Services
  // =========================================================================

  const favoritesClient = useMemo(
    () =>
      new FavoritesClient(DASHBOARD_APP_ID, DASHBOARD_SAVED_OBJECT_TYPE, {
        http: coreServices.http,
        usageCollection: usageCollectionService,
        userProfile: coreServices.userProfile,
      }),
    []
  );

  // =========================================================================
  // Item Actions - Adapt from existing hook
  // =========================================================================

  const getHref = useCallback(
    (item: DashboardItem) => {
      return getDashboardListItemLink(kbnUrlStateStorage, item.id, item.timeRestore ?? false);
    },
    [kbnUrlStateStorage]
  );

  const onClick = useCallback(
    (item: DashboardItem) => {
      goToDashboard(item.id);
    },
    [goToDashboard]
  );

  const onEdit = useCallback(
    (item: DashboardItem) => {
      if (editItem) {
        // Cast is safe - editItem only uses the id field.
        editItem(item as unknown as DashboardSavedObjectUserContent);
      }
    },
    [editItem]
  );

  const onDelete = useCallback(
    async (item: DashboardItem) => {
      if (deleteItems) {
        // Cast is safe - deleteItems only uses the id field.
        await deleteItems([item as unknown as DashboardSavedObjectUserContent]);
      }
    },
    [deleteItems]
  );

  const isItemActionEnabled = useCallback(
    (item: DashboardItem) => {
      // Check item permissions using rowItemActions if available.
      // Cast is safe - rowItemActions uses specific fields we preserve.
      const rowActions = tableListViewTableProps.rowItemActions?.(
        item as unknown as DashboardSavedObjectUserContent
      );
      return rowActions?.edit?.enabled !== false;
    },
    [tableListViewTableProps]
  );

  const onSelectionDelete = useCallback(
    async (items: ContentListItem[]) => {
      if (deleteItems) {
        // Cast is safe - deleteItems only uses the id field.
        await deleteItems(items as unknown as DashboardSavedObjectUserContent[]);
      }
    },
    [deleteItems]
  );

  const onCreate = useCallback(() => {
    if (createItem) {
      createItem();
    }
  }, [createItem]);

  // =========================================================================
  // Content Editor - Adapt from existing hook
  // =========================================================================

  const isItemReadonly = useCallback(
    (item: ContentListItem): boolean => {
      // Cast is safe - rowItemActions uses specific fields we preserve.
      const rowActions = tableListViewTableProps.rowItemActions?.(
        item as unknown as DashboardSavedObjectUserContent
      );
      return rowActions?.edit?.enabled === false;
    },
    [tableListViewTableProps]
  );

  const getReadonlyReason = useCallback(
    (item: ContentListItem): string | undefined => {
      // Cast is safe - rowItemActions uses specific fields we preserve.
      const rowActions = tableListViewTableProps.rowItemActions?.(
        item as unknown as DashboardSavedObjectUserContent
      );
      return rowActions?.edit?.reason;
    },
    [tableListViewTableProps]
  );

  // =========================================================================
  // Configuration
  // =========================================================================

  const isReadOnly = !showWriteControls;
  const showCreateButton = !!createItem;

  // =========================================================================
  // Shared Props
  // =========================================================================

  const sharedItemProps = {
    getHref,
    actions: {
      onClick,
      onEdit: editItem
        ? {
            handler: onEdit,
            isEnabled: isItemActionEnabled,
          }
        : undefined,
      onDelete: deleteItems
        ? {
            handler: onDelete,
            isEnabled: isItemActionEnabled,
          }
        : undefined,
    },
  };

  const sharedFeatures = {
    globalActions: showCreateButton ? { onCreate } : undefined,
    selection: deleteItems ? { onSelectionDelete } : undefined,
    search: {
      initialQuery: initialFilter,
    },
    sorting: {
      initialSort: { field: 'updatedAt' as const, direction: 'desc' as const },
    },
    contentEditor: contentEditor
      ? {
          onSave: contentEditor.onSave,
          customValidators: contentEditor.customValidators,
          isReadonly: isItemReadonly,
          readonlyReason: getReadonlyReason,
          appendRows: !serverlessService
            ? createActivityAppendRows(contentInsightsClient, strings.entityNamePlural)
            : undefined,
        }
      : undefined,
  };

  return (
    <I18nProvider>
      <QueryClientProvider client={dashboardQueryClient}>
        <EuiPageTemplate.Section>
          <EuiFlexGroup direction="column" gutterSize="m">
            {/* Page Title */}
            <EuiFlexItem grow={false}>
              <EuiTitle size="l">
                <h1 data-test-subj="dashboardListingHeading">{strings.pageTitle}</h1>
              </EuiTitle>
            </EuiFlexItem>

            {/* Unsaved Changes Listing */}
            {unsavedDashboardIds.length > 0 && (
              <EuiFlexItem grow={false}>
                <DashboardUnsavedListing
                  goToDashboard={goToDashboard}
                  unsavedDashboardIds={unsavedDashboardIds}
                  refreshUnsavedDashboards={refreshUnsavedDashboards}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPageTemplate.Section>

        {/* ================================================================= */}
        {/* CLIENT PROVIDER - Uses findItems with client-side operations */}
        {/* ================================================================= */}
        <EuiPageTemplate.Section>
          <ContentListClientKibanaProvider
            findItems={findItems}
            transform={dashboardTransform}
            entityName={strings.entityName}
            entityNamePlural={strings.entityNamePlural}
            services={{
              core: coreServices,
              savedObjectsTagging: savedObjectsTaggingService!.getTaggingApi()!,
              favorites: { favoritesClient },
            }}
            isReadOnly={isReadOnly}
            item={sharedItemProps}
            features={sharedFeatures}
          >
            {/* ContentEditorKibanaProvider must be inside ContentListProvider to access UserProfilesProvider.
                ContentEditorActionProvider must be inside ContentEditorKibanaProvider to call useOpenContentEditor. */}
            <ContentEditorKibanaProvider
              core={coreServices}
              // Cast needed due to generic type mismatch between SavedObjectsTaggingApi and ContentEditorKibanaDependencies.
              savedObjectsTagging={
                savedObjectsTaggingService?.getTaggingApi() as ContentEditorKibanaDependencies['savedObjectsTagging']
              }
            >
              <ContentEditorActionProvider>
                <EuiFlexGroup direction="column" gutterSize="m">
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                      <EuiFlexItem grow={true}>
                        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiIcon type="desktop" size="l" color="text" />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiTitle size="s">
                              <h2>Client Provider</h2>
                            </EuiTitle>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <ViewModeToggle
                          viewMode={listViewMode}
                          onChange={setListViewMode}
                          data-test-subj="dashboardViewModeToggle-client"
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <ContentListToolbar data-test-subj="dashboardListingToolbar-client" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    {listViewMode === 'table' ? (
                      <ContentListTable
                        title={strings.tableTitle}
                        data-test-subj="dashboardListingTable-client"
                      />
                    ) : (
                      <ContentListGrid
                        iconType="dashboardApp"
                        data-test-subj="dashboardListingGrid-client"
                      />
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </ContentEditorActionProvider>
            </ContentEditorKibanaProvider>
          </ContentListClientKibanaProvider>
        </EuiPageTemplate.Section>

        <EuiHorizontalRule margin="xl" />

        {/* ================================================================= */}
        {/* SERVER PROVIDER - Uses savedObjectType with server-side operations */}
        {/* ================================================================= */}
        <EuiPageTemplate.Section>
          <ContentListServerKibanaProvider
            savedObjectType={DASHBOARD_SAVED_OBJECT_TYPE}
            searchFieldsConfig={{ additionalAttributes: ['time_range', 'access_control'] }}
            entityName={strings.entityName}
            entityNamePlural={strings.entityNamePlural}
            services={{
              core: coreServices,
              savedObjectsTagging: savedObjectsTaggingService!.getTaggingApi()!,
              favorites: { favoritesClient },
            }}
            isReadOnly={isReadOnly}
            item={sharedItemProps}
            features={sharedFeatures}
          >
            {/* ContentEditorKibanaProvider must be inside ContentListProvider to access UserProfilesProvider.
                ContentEditorActionProvider must be inside ContentEditorKibanaProvider to call useOpenContentEditor. */}
            <ContentEditorKibanaProvider
              core={coreServices}
              // Cast needed due to generic type mismatch between SavedObjectsTaggingApi and ContentEditorKibanaDependencies.
              savedObjectsTagging={
                savedObjectsTaggingService?.getTaggingApi() as ContentEditorKibanaDependencies['savedObjectsTagging']
              }
            >
              <ContentEditorActionProvider>
                <EuiFlexGroup direction="column" gutterSize="m">
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                      <EuiFlexItem grow={true}>
                        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiIcon type="storage" size="l" color="text" />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiTitle size="s">
                              <h2>Server Provider</h2>
                            </EuiTitle>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <ViewModeToggle
                          viewMode={listViewMode}
                          onChange={setListViewMode}
                          data-test-subj="dashboardViewModeToggle-server"
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <ContentListToolbar data-test-subj="dashboardListingToolbar-server" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    {listViewMode === 'table' ? (
                      <ContentListTable
                        title={strings.tableTitle}
                        data-test-subj="dashboardListingTable-server"
                      />
                    ) : (
                      <ContentListGrid
                        iconType="dashboardApp"
                        data-test-subj="dashboardListingGrid-server"
                      />
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </ContentEditorActionProvider>
            </ContentEditorKibanaProvider>
          </ContentListServerKibanaProvider>
        </EuiPageTemplate.Section>
      </QueryClientProvider>
    </I18nProvider>
  );
};

// Default export for lazy loading.
// eslint-disable-next-line import/no-default-export
export default DashboardContentList;
