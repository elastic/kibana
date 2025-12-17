/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { OpenContentEditorParams } from '@kbn/content-management-content-editor';
import { ContentInsightsClient } from '@kbn/content-management-content-insights-public';
import type { TableListViewTableProps } from '@kbn/content-management-table-list-view-table';
import type { Reference } from '@kbn/content-management-utils';
import type { ViewMode } from '@kbn/presentation-publishing';
import { asyncMap } from '@kbn/std';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';

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
  savedObjectsTaggingService,
  contentManagementService,
} from '../../services/kibana_services';
import { logger } from '../../services/logger';
import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';
import { getAccessControlClient } from '../../services/access_control_service';
import {
  SAVED_OBJECT_LOADED_TIME,
  SAVED_OBJECT_DELETE_TIME,
} from '../../utils/telemetry_constants';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../common/constants';
import {
  dashboardListingErrorStrings,
  dashboardListingTableStrings,
} from '../_dashboard_listing_strings';
import { confirmCreateWithUnsaved } from '../confirm_overlays';
import { DashboardListingEmptyPrompt } from '../dashboard_listing_empty_prompt';
import { type DashboardSavedObjectUserContent } from '../types';

type GetDetailViewLink =
  TableListViewTableProps<DashboardSavedObjectUserContent>['getDetailViewLink'];

const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';
const SAVED_OBJECTS_PER_PAGE_SETTING = 'savedObjects:perPage';

const getReferenceIds = (refs?: Reference[]) => refs?.map((r) => r.id);

async function findDashboardListingItems(
  searchTerm: string,
  options?: { references?: Reference[]; referencesToExclude?: Reference[] }
): Promise<{ total: number; hits: DashboardSavedObjectUserContent[] }> {
  const { references, referencesToExclude } = options ?? {};
  const limit = coreServices.uiSettings.get<number>(SAVED_OBJECTS_LIMIT_SETTING);
  const startTime = window.performance.now();

  const reportSearchDuration = (type: string) => {
    reportPerformanceMetricEvent(coreServices.analytics, {
      eventName: SAVED_OBJECT_LOADED_TIME,
      duration: window.performance.now() - startTime,
      meta: { saved_object_type: type },
    });
  };

  const accessControlClient = getAccessControlClient();
  const [userResponse, globalPrivilegeResponse] = await Promise.allSettled([
    coreServices.userProfile.getCurrent(),
    accessControlClient.checkGlobalPrivilege(DASHBOARD_SAVED_OBJECT_TYPE),
  ]);
  const userId = userResponse.status === 'fulfilled' ? userResponse.value.uid : undefined;
  const isGloballyAuthorized =
    globalPrivilegeResponse.status === 'fulfilled' ? globalPrivilegeResponse.value : undefined;

  const { total, dashboards } = await findService.search({
    search: searchTerm,
    per_page: limit,
    tags: {
      included: getReferenceIds(references) ?? [],
      excluded: getReferenceIds(referencesToExclude) ?? [],
    },
  });
  reportSearchDuration(DASHBOARD_SAVED_OBJECT_TYPE);

  const tagApi = savedObjectsTaggingService?.getTaggingApi();
  return {
    total,
    hits: dashboards.map(({ id, data, meta }) => {
      const canManageAccessControl =
        isGloballyAuthorized ||
        accessControlClient.checkUserAccessControl({
          accessControl: {
            owner: data?.access_control?.owner,
            accessMode: data?.access_control?.access_mode,
          },
          createdBy: meta.created_at,
          userId,
        });

      return {
        type: 'dashboard',
        id,
        updatedAt: meta.updated_at!,
        createdAt: meta.created_at,
        createdBy: meta.created_by,
        updatedBy: meta.updated_by,
        references: tagApi && data.tags ? data.tags.map(tagApi.ui.tagIdToReference) : [],
        managed: meta.managed,
        canManageAccessControl,
        accessMode: data?.access_control?.access_mode,
        attributes: {
          title: data.title,
          description: data.description,
          timeRestore: Boolean(data.time_range),
        },
      } as DashboardSavedObjectUserContent;
    }),
  };
}

async function deleteDashboardListingItems(
  itemsToDelete: Array<{ id: string; type?: string }>
): Promise<void> {
  if (!itemsToDelete || itemsToDelete.length === 0) {
    return;
  }

  const dashboardBackupService = getDashboardBackupService();

  try {
    const deleteStartTime = window.performance.now();

    await asyncMap(itemsToDelete, async ({ id, type }) => {
      if (type === 'dashboard') {
        await dashboardClient.delete(id);
        dashboardBackupService.clearState(id);
      } else if (type) {
        await contentManagementService.client.delete({
          contentTypeId: type,
          id,
        });
      }
    });

    reportPerformanceMetricEvent(coreServices.analytics, {
      eventName: SAVED_OBJECT_DELETE_TIME,
      duration: window.performance.now() - deleteStartTime,
      meta: {
        saved_object_type: itemsToDelete[0]?.type ?? 'unknown',
        total: itemsToDelete.length,
      },
    });
  } catch (error) {
    coreServices.notifications.toasts.addError(error, {
      title: dashboardListingErrorStrings.getErrorDeletingDashboardToast(),
    });
  }
}

type DashboardListingViewTableProps = Omit<
  TableListViewTableProps<DashboardSavedObjectUserContent>,
  'tableCaption'
> & { title: string };

interface UseDashboardListingTableReturnType {
  hasInitialFetchReturned: boolean;
  pageDataTestSubject: string | undefined;
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
}): UseDashboardListingTableReturnType => {
  const { getEntityName, getTableListTitle, getEntityNamePlural } = dashboardListingTableStrings;

  const entityName = getEntityName();
  const entityNamePlural = getEntityNamePlural();

  const title = getTableListTitle();

  const dashboardBackupService = useMemo(() => getDashboardBackupService(), []);

  const [unsavedDashboardIds, setUnsavedDashboardIds] = useState<string[]>(
    dashboardBackupService.getDashboardIdsWithUnsavedChanges()
  );

  const [pageDataTestSubject, setPageDataTestSubject] = useState<string>();
  const [hasInitialFetchReturned, setHasInitialFetchReturned] = useState(false);

  const listingLimit = coreServices.uiSettings.get(SAVED_OBJECTS_LIMIT_SETTING);
  const initialPageSize = coreServices.uiSettings.get(SAVED_OBJECTS_PER_PAGE_SETTING);

  const createItem = useCallback(() => {
    if (useSessionStorageIntegration && dashboardBackupService.dashboardHasUnsavedEdits()) {
      confirmCreateWithUnsaved(() => {
        dashboardBackupService.clearState();
        goToDashboard();
      }, goToDashboard);
      return;
    }
    goToDashboard();
  }, [dashboardBackupService, goToDashboard, useSessionStorageIntegration]);

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
      await deleteDashboardListingItems(itemsToDelete);
      setUnsavedDashboardIds(dashboardBackupService.getDashboardIdsWithUnsavedChanges());
    },
    [dashboardBackupService]
  );

  const editItem = useCallback(
    (item: DashboardSavedObjectUserContent) => goToDashboard(item.id, 'edit'),
    [goToDashboard]
  );

  const onFetchSuccess = useCallback(() => {
    if (!hasInitialFetchReturned) {
      setHasInitialFetchReturned(true);
    }
  }, [hasInitialFetchReturned]);

  const getDetailViewLink = useCallback<NonNullable<GetDetailViewLink>>(
    (entity: DashboardSavedObjectUserContent) => {
      const dashboard = entity as DashboardSavedObjectUserContent;
      return getDashboardUrl(dashboard.id, dashboard.attributes.timeRestore);
    },
    [getDashboardUrl]
  );

  const tableListViewTableProps: DashboardListingViewTableProps = useMemo(() => {
    const { showWriteControls } = getDashboardCapabilities();

    return {
      contentEditor: {
        isReadonly: !showWriteControls,
        onSave: updateItemMeta,
        customValidators: contentEditorValidators,
      },
      createItem: !showWriteControls || !showCreateDashboardButton ? undefined : createItem,
      deleteItems: !showWriteControls ? undefined : deleteItems,
      editItem: !showWriteControls ? undefined : editItem,
      emptyPrompt: (
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
      findItems: findDashboardListingItems,
      getDetailViewLink,
      headingId,
      id: dashboardListingId,
      initialFilter,
      initialPageSize,
      listingLimit,
      onFetchSuccess,
      setPageDataTestSubject,
      title,
      urlStateEnabled,
      createdByEnabled: true,
      recentlyAccessed: getDashboardRecentlyAccessedService(),
      rowItemActions: (item) => {
        const { managed } = item;
        const dashboardItem = item as DashboardSavedObjectUserContent;

        const isDisabled = () => {
          if (!showWriteControls) return true;
          if (managed === true) return true;
          if (
            dashboardItem.canManageAccessControl === false &&
            dashboardItem.accessMode === 'write_restricted'
          )
            return true;
          return false;
        };

        const getReason = () => {
          if (!showWriteControls) {
            return contentEditorFlyoutStrings.readonlyReason.missingPrivileges;
          }
          if (managed) {
            return contentEditorFlyoutStrings.readonlyReason.managedEntity;
          }
          if (dashboardItem.canManageAccessControl === false) {
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
    createItem,
    dashboardListingId,
    deleteItems,
    disableCreateDashboardButton,
    editItem,
    entityName,
    entityNamePlural,
    goToDashboard,
    getDetailViewLink,
    headingId,
    initialFilter,
    initialPageSize,
    listingLimit,
    onFetchSuccess,
    setPageDataTestSubject,
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
    hasInitialFetchReturned,
    pageDataTestSubject,
    refreshUnsavedDashboards,
    tableListViewTableProps,
    unsavedDashboardIds,
    contentInsightsClient,
  };
};
