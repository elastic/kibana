/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { OpenContentEditorParams } from '@kbn/content-management-content-editor';
import { ContentInsightsClient } from '@kbn/content-management-content-insights-public';
import type { GetResult } from '@kbn/content-management-plugin/common';
import type { TableListViewTableProps } from '@kbn/content-management-table-list-view-table';
import type { Reference } from '@kbn/content-management-utils';
import type { ViewMode } from '@kbn/presentation-publishing';

import { contentEditorFlyoutStrings } from '../../dashboard_app/_dashboard_app_strings';
import {
  checkForDuplicateDashboardTitle,
  dashboardClient,
  findService,
} from '../../dashboard_client';
import { getDashboardBackupService } from '../../services/dashboard_backup_service';
import { getDashboardRecentlyAccessedService } from '../../services/dashboard_recently_accessed_service';
import {
  coreServices,
  embeddableService,
  visualizationsService,
  contentManagementService,
  savedObjectsTaggingService,
} from '../../services/kibana_services';
import { logger } from '../../services/logger';
import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';
import {
  dashboardListingErrorStrings,
  dashboardListingTableStrings,
} from '../_dashboard_listing_strings';
import { confirmCreateWithUnsaved } from '../confirm_overlays';
import { DashboardListingEmptyPrompt } from '../dashboard_listing_empty_prompt';
import {
  TAB_IDS,
  type TabId,
  type DashboardListingUserContent,
  type DashboardVisualizationUserContent,
  type DashboardSavedObjectUserContent,
} from '../types';
import { findDashboardListingItems } from './helpers/find_items';
import { deleteDashboardListingItems } from './helpers/delete_items';
import { editDashboardListingItem } from './helpers/edit_item';
import { navigateToVisualization } from './helpers/navigation';
import { getEntityNames } from './helpers/entity_names';
import {
  getVisualizationListingColumn,
  getVisualizationListingEmptyPrompt,
} from '../utils/visualization_listing_helpers';

type GetDetailViewLink = TableListViewTableProps<DashboardListingUserContent>['getDetailViewLink'];

const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';
const SAVED_OBJECTS_PER_PAGE_SETTING = 'savedObjects:perPage';

interface SavedObjectWithReferences {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  references: Reference[];
}

type DashboardListingViewTableProps = Omit<
  TableListViewTableProps<DashboardListingUserContent>,
  'tableCaption' | 'onFetchSuccess' | 'setPageDataTestSubject'
> & { title: string };

interface UseDashboardListingTableReturnType {
  refreshUnsavedDashboards: () => void;
  tableListViewTableProps: DashboardListingViewTableProps;
  unsavedDashboardIds: string[];
  contentInsightsClient: ContentInsightsClient;
}

export const useDashboardListingTable = ({
  dashboardListingId = 'dashboard',
  disableCreateDashboardButton,
  getDashboardUrl,
  goToDashboard,
  headingId = 'dashboardListingHeading',
  initialFilter,
  urlStateEnabled,
  useSessionStorageIntegration,
  showCreateDashboardButton = true,
  contentTypeFilter,
}: {
  dashboardListingId?: string;
  disableCreateDashboardButton?: boolean;
  getDashboardUrl: (dashboardId: string, usesTimeRestore: boolean) => string;
  goToDashboard: (dashboardId?: string, viewMode?: ViewMode) => void;
  headingId?: string;
  initialFilter?: string;
  urlStateEnabled?: boolean;
  useSessionStorageIntegration?: boolean;
  showCreateDashboardButton?: boolean;
  contentTypeFilter?: TabId;
}): UseDashboardListingTableReturnType => {
  const { getTableListTitle } = dashboardListingTableStrings;

  const { entityName, entityNamePlural } = getEntityNames(contentTypeFilter);

  const title = getTableListTitle();

  const dashboardBackupService = useMemo(() => getDashboardBackupService(), []);

  const [unsavedDashboardIds, setUnsavedDashboardIds] = useState<string[]>(
    dashboardBackupService.getDashboardIdsWithUnsavedChanges()
  );

  const listingLimit = coreServices.uiSettings.get(SAVED_OBJECTS_LIMIT_SETTING);
  const initialPageSize = coreServices.uiSettings.get(SAVED_OBJECTS_PER_PAGE_SETTING);

  const closeNewVisModal = useRef(() => {});
  const currentListingItems = useRef<DashboardListingUserContent[]>([]);
  const { pathname } = useLocation();

  const createItem = useCallback(
    (contentTypeTab?: TabId) => {
      const contentType = contentTypeTab ?? contentTypeFilter;

      switch (contentType) {
        case TAB_IDS.VISUALIZATIONS:
          closeNewVisModal.current = visualizationsService.showNewVisModal();
          return;

        case TAB_IDS.DASHBOARDS:
        default:
          if (useSessionStorageIntegration && dashboardBackupService.dashboardHasUnsavedEdits()) {
            confirmCreateWithUnsaved(() => {
              dashboardBackupService.clearState();
              goToDashboard();
            }, goToDashboard);
            return;
          }
          goToDashboard();
      }
    },
    [dashboardBackupService, goToDashboard, useSessionStorageIntegration, contentTypeFilter]
  );

  useEffect(() => {
    return () => {
      closeNewVisModal.current();
    };
  }, [pathname]);

  const updateItemMeta = useCallback(
    async ({ id, ...updatedState }: Parameters<Required<OpenContentEditorParams>['onSave']>[0]) => {
      const dashboard = await findService.findById(id);
      if (dashboard.status === 'error') {
        return;
      }
      const { references, ...currentState } = dashboard.attributes;
      await dashboardClient.update(
        id,
        {
          ...currentState,
          ...updatedState,
        },
        dashboard.references
      );

      setUnsavedDashboardIds(dashboardBackupService.getDashboardIdsWithUnsavedChanges());
    },
    [dashboardBackupService]
  );

  const updateVisualizationMeta = useCallback(
    async (args: { id: string; title: string; description?: string; tags: string[] }) => {
      const content = currentListingItems.current?.find(({ id }) => id === args.id);

      if (content && content.type !== 'dashboard') {
        const visItem = content as DashboardVisualizationUserContent;
        try {
          const result = await contentManagementService.client.get<
            { contentTypeId: string; id: string },
            GetResult<SavedObjectWithReferences>
          >({
            contentTypeId: visItem.savedObjectType,
            id: visItem.id,
          });

          if (result?.item) {
            let references = result.item.references || [];
            const savedObjectsTagging = savedObjectsTaggingService?.getTaggingApi?.();
            if (savedObjectsTagging) {
              references = savedObjectsTagging.ui.updateTagsReferences(references, args.tags || []);
            }

            // Update the visualization with new attributes
            await contentManagementService.client.update({
              contentTypeId: visItem.savedObjectType,
              id: visItem.id,
              data: {
                ...result.item.attributes,
                title: args.title,
                description: args.description ?? '',
              },
              options: {
                references,
              },
            });
          }
        } catch (error) {
          coreServices.notifications.toasts.addError(error, {
            title: dashboardListingErrorStrings.getErrorDeletingDashboardToast(),
          });
        }
      }
    },
    []
  );

  const contentEditorValidators: OpenContentEditorParams['customValidators'] = useMemo(
    () => ({
      title: [
        {
          type: 'warning',
          fn: async (value: string, id: string) => {
            if (id) {
              try {
                const dashboard = await findService.findById(id);
                if (dashboard.status === 'error') {
                  return;
                }

                const validTitle = await checkForDuplicateDashboardTitle({
                  title: value,
                  copyOnSave: false,
                  lastSavedTitle: dashboard.attributes.title,
                  isTitleDuplicateConfirmed: false,
                });

                if (!validTitle) {
                  throw new Error(dashboardListingErrorStrings.getDuplicateTitleWarning(value));
                }
              } catch (e) {
                return e.message;
              }
            }
          },
        },
      ],
    }),
    []
  );

  const deleteItems = useCallback(
    async (itemsToDelete: Array<{ id: string; type?: string }>) => {
      await deleteDashboardListingItems({ itemsToDelete });
      setUnsavedDashboardIds(dashboardBackupService.getDashboardIdsWithUnsavedChanges());
    },
    [dashboardBackupService]
  );

  const editItem = useCallback(
    (item: DashboardListingUserContent) => editDashboardListingItem(item, goToDashboard),
    [goToDashboard]
  );

  const getDetailViewLink = useCallback<NonNullable<GetDetailViewLink>>(
    (entity: DashboardListingUserContent) => {
      if (entity.type !== 'dashboard') {
        return undefined;
      }

      const dashboard = entity as DashboardSavedObjectUserContent;
      return getDashboardUrl(dashboard.id, dashboard.attributes.timeRestore);
    },
    [getDashboardUrl]
  );

  const getOnClickTitle = useCallback((item: DashboardListingUserContent) => {
    const { id, type } = item;

    // Dashboards: let the link handle it (no onClick needed)
    if (type === 'dashboard') {
      return undefined;
    }

    // Annotation groups are view-only - don't allow clicking
    if (type === 'event-annotation-group') {
      return undefined;
    }

    // Handle visualizations (including lens, maps, links, etc.)
    const visItem = item as DashboardVisualizationUserContent;

    // Don't allow clicking on read-only visualizations
    if (visItem.attributes.readOnly) {
      return undefined;
    }

    // Use editor config if available (e.g., maps have editApp='maps')
    const { editor } = visItem;
    if (editor && 'editUrl' in editor && editor.editApp) {
      return () =>
        coreServices.application.navigateToApp(editor.editApp!, { path: editor.editUrl });
    }

    // Default: open in visualize app
    return () => navigateToVisualization(embeddableService.getStateTransfer(), id!);
  }, []);

  const findItems = useCallback(
    async (
      searchTerm: string,
      options?: { references?: Reference[]; referencesToExclude?: Reference[] }
    ) => {
      const results = await findDashboardListingItems(
        searchTerm,
        contentTypeFilter ?? TAB_IDS.DASHBOARDS,
        options
      );
      currentListingItems.current = results.hits;
      return results;
    },
    [contentTypeFilter]
  );

  const tableListViewTableProps: DashboardListingViewTableProps = useMemo(() => {
    const { showWriteControls } = getDashboardCapabilities();
    const visualizeCapabilities = coreServices.application.capabilities.visualize_v2;

    const getContentEditor = () => {
      if (contentTypeFilter === TAB_IDS.DASHBOARDS) {
        return {
          isReadonly: !showWriteControls,
          onSave: updateItemMeta,
          customValidators: contentEditorValidators,
        };
      }
      // This allows editing for visualizations unless the user lacks save permissions
      return {
        enabled: true,
        isReadonly: !visualizeCapabilities?.save,
        onSave: updateVisualizationMeta,
      };
    };

    return {
      contentEditor: getContentEditor(),
      createItem: !showWriteControls || !showCreateDashboardButton ? undefined : createItem,
      deleteItems: !showWriteControls ? undefined : deleteItems,
      editItem: !showWriteControls ? undefined : editItem,
      emptyPrompt:
        contentTypeFilter === TAB_IDS.VISUALIZATIONS ? (
          getVisualizationListingEmptyPrompt(createItem)
        ) : (
          <DashboardListingEmptyPrompt
            createItem={createItem}
            disableCreateDashboardButton={disableCreateDashboardButton}
            goToDashboard={goToDashboard}
            setUnsavedDashboardIds={setUnsavedDashboardIds}
            unsavedDashboardIds={unsavedDashboardIds}
            useSessionStorageIntegration={useSessionStorageIntegration}
          />
        ),
      entityName,
      entityNamePlural,
      findItems,
      getDetailViewLink,
      getOnClickTitle,
      headingId,
      id: dashboardListingId,
      initialFilter,
      initialPageSize,
      listingLimit,
      title,
      urlStateEnabled,
      createdByEnabled: contentTypeFilter === TAB_IDS.DASHBOARDS,
      recentlyAccessed: getDashboardRecentlyAccessedService(),
      rowItemActions: (item) => {
        const { managed, type } = item;

        // Check for read-only visualizations (our addition for multi-tab)
        const isReadOnlyVisualization =
          type !== 'dashboard' &&
          type !== 'event-annotation-group' &&
          (item as DashboardVisualizationUserContent).attributes.readOnly;

        // Main's access control logic (dashboard-only)
        const isDisabled = () => {
          if (!showWriteControls) return true;
          if (managed === true) return true;
          if (type === 'dashboard') {
            const dashboardItem = item as DashboardSavedObjectUserContent;
            if (
              dashboardItem.canManageAccessControl === false &&
              dashboardItem.accessMode === 'write_restricted'
            )
              return true;
          }
          if (isReadOnlyVisualization) return true;
          return false;
        };

        const getReason = () => {
          if (!showWriteControls) {
            return contentEditorFlyoutStrings.readonlyReason.missingPrivileges;
          }
          if (managed) {
            return contentEditorFlyoutStrings.readonlyReason.managedEntity;
          }
          if (type === 'dashboard') {
            const dashboardItem = item as DashboardSavedObjectUserContent;
            if (dashboardItem.canManageAccessControl === false) {
              return contentEditorFlyoutStrings.readonlyReason.accessControl;
            }
          }
          if (isReadOnlyVisualization) {
            return dashboardListingTableStrings.getReadOnlyVisualizationMessage();
          }
        };

        return {
          edit: {
            enabled: !isDisabled(),
            reason: getReason(),
          },
          delete: {
            enabled: !isDisabled(),
            reason: getReason(),
          },
        };
      },
      customTableColumn:
        contentTypeFilter === TAB_IDS.VISUALIZATIONS
          ? (getVisualizationListingColumn() as EuiBasicTableColumn<DashboardListingUserContent>)
          : undefined,
    };
  }, [
    contentEditorValidators,
    contentTypeFilter,
    createItem,
    dashboardListingId,
    deleteItems,
    disableCreateDashboardButton,
    editItem,
    entityName,
    entityNamePlural,
    goToDashboard,
    findItems,
    getDetailViewLink,
    getOnClickTitle,
    headingId,
    initialFilter,
    initialPageSize,
    listingLimit,
    showCreateDashboardButton,
    title,
    unsavedDashboardIds,
    updateItemMeta,
    updateVisualizationMeta,
    urlStateEnabled,
    useSessionStorageIntegration,
  ]);

  const refreshUnsavedDashboards = useCallback(
    () => setUnsavedDashboardIds(getDashboardBackupService().getDashboardIdsWithUnsavedChanges()),
    []
  );

  const contentInsightsClient = useMemo(
    () => new ContentInsightsClient({ http: coreServices.http, logger }, { domainId: 'dashboard' }),
    []
  );

  return {
    refreshUnsavedDashboards,
    tableListViewTableProps,
    unsavedDashboardIds,
    contentInsightsClient,
  };
};
