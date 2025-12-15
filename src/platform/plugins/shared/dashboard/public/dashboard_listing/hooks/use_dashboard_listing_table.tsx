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
import type { TableListViewTableProps } from '@kbn/content-management-table-list-view-table';
import type { Reference } from '@kbn/content-management-utils';
import type { ViewMode } from '@kbn/presentation-publishing';

import { contentEditorFlyoutStrings } from '../../dashboard_app/_dashboard_app_strings';
import {
  checkForDuplicateDashboardTitle,
  dashboardClient,
  findService,
} from '../../dashboard_client';
import { getAccessControlClient } from '../../services/access_control_service';
import { getDashboardBackupService } from '../../services/dashboard_backup_service';
import { getDashboardRecentlyAccessedService } from '../../services/dashboard_recently_accessed_service';
import {
  coreServices,
  embeddableService,
  visualizationsService,
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
import {
  checkForDuplicateDashboardTitle,
  dashboardClient,
  findService,
} from '../../dashboard_client';
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

  const accessControlClient = getAccessControlClient();

  const listingLimit = coreServices.uiSettings.get(SAVED_OBJECTS_LIMIT_SETTING);
  const initialPageSize = coreServices.uiSettings.get(SAVED_OBJECTS_PER_PAGE_SETTING);

  // Store close function for new visualization modal (to close on navigation)
  const closeNewVisModal = useRef(() => {});
  const { pathname } = useLocation();

  const createItem = useCallback(
    (contentTypeTab?: TabId) => {
      const contentType = contentTypeTab ?? contentTypeFilter;

      switch (contentType) {
        case TAB_IDS.VISUALIZATIONS:
          closeNewVisModal.current = visualizationsService.showNewVisModal();
          return;

        case TAB_IDS.ANNOTATIONS:
          coreServices.application.navigateToApp('lens', { path: '#/' });
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

  const rowItemActions = useCallback((item: DashboardListingUserContent) => {
    const { showWriteControls } = getDashboardCapabilities();
    const { managed, type } = item;
    const isReadOnlyVisualization =
      type !== 'dashboard' &&
      type !== 'event-annotation-group' &&
      (item as DashboardVisualizationUserContent).attributes.readOnly;

    // Disable edit for managed items or read-only visualizations
    if (!showWriteControls || managed || isReadOnlyVisualization) {
      return {
        edit: {
          enabled: false,
          reason: managed
            ? dashboardListingTableStrings.getManagementItemDisabledEditMessage()
            : isReadOnlyVisualization
            ? dashboardListingTableStrings.getReadOnlyVisualizationMessage()
            : undefined,
        },
      };
    }

    return undefined;
  }, []);

  const findItems = useCallback(
    (
      searchTerm: string,
      options?: { references?: Reference[]; referencesToExclude?: Reference[] }
    ) => findDashboardListingItems(searchTerm, contentTypeFilter ?? TAB_IDS.DASHBOARDS, options),
    [contentTypeFilter]
  );

  const tableListViewTableProps: DashboardListingViewTableProps = useMemo(() => {
    const { showWriteControls } = getDashboardCapabilities();
    return {
      contentEditor:
        contentTypeFilter === TAB_IDS.DASHBOARDS
          ? {
              isReadonly: !showWriteControls,
              onSave: updateItemMeta,
              customValidators: contentEditorValidators,
            }
          : {
              enabled: false,
            },
      createItem: !showWriteControls || !showCreateDashboardButton ? undefined : createItem,
      deleteItems: !showWriteControls ? undefined : deleteItems,
      editItem: !showWriteControls ? undefined : editItem,
      emptyPrompt:
        contentTypeFilter === TAB_IDS.VISUALIZATIONS ||
        contentTypeFilter === TAB_IDS.ANNOTATIONS ? (
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
      rowItemActions,
      headingId,
      id: dashboardListingId,
      initialFilter,
      initialPageSize,
      listingLimit,
      title,
      urlStateEnabled,
      createdByEnabled: contentTypeFilter === TAB_IDS.DASHBOARDS,
      recentlyAccessed: getDashboardRecentlyAccessedService(),
      customTableColumn:
        contentTypeFilter === TAB_IDS.VISUALIZATIONS
          ? (getVisualizationListingColumn() as EuiBasicTableColumn<DashboardListingUserContent>)
          : undefined,
      rowItemActions: (item) => {
        const isDisabled = () => {
          if (!showWriteControls) return true;
          if (item?.managed === true) return true;
          if (item?.canManageAccessControl === false && item?.accessMode === 'write_restricted')
            return true;
          return false;
        };

        const getReason = () => {
          if (!showWriteControls) {
            return contentEditorFlyoutStrings.readonlyReason.missingPrivileges;
          }
          if (item?.managed) {
            return contentEditorFlyoutStrings.readonlyReason.managedEntity;
          }
          if (item?.canManageAccessControl === false) {
            return contentEditorFlyoutStrings.readonlyReason.accessControl;
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
    rowItemActions,
    showCreateDashboardButton,
    title,
    unsavedDashboardIds,
    updateItemMeta,
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
