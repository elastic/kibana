/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode, useCallback, useMemo, useState } from 'react';

import type { OpenContentEditorParams } from '@kbn/content-management-content-editor';
import { ContentInsightsClient } from '@kbn/content-management-content-insights-public';
import {
  createTagsService,
  createUserProfilesService,
  SavedObjectActivityRow,
  useRecentlyAccessedDecoration,
  type ContentListClientFeatures,
  type ContentListClientProviderProps,
  type ContentListClientServices,
  type TableListViewFindItemsOptions,
} from '@kbn/content-list-provider-client';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type { ViewMode } from '@kbn/presentation-publishing';

import { asyncMap } from '@kbn/std';
import { PAGINATION_MAX_SIZE } from '@kbn/as-code-shared-schemas';
import type { ContentListItem, ContentListItemConfig } from '@kbn/content-list';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { contentEditorFlyoutStrings } from '../../dashboard_app/_dashboard_app_strings';
import { dashboardClient, findService, hasLibraryItemWithTitle } from '../../dashboard_client';
import { getAccessControlClient } from '../../services/access_control_service';
import { getDashboardRecentlyAccessedService } from '../../services/dashboard_recently_accessed_service';
import {
  coreServices,
  savedObjectsTaggingService,
  serverlessService,
} from '../../services/kibana_services';
import { logger } from '../../services/logger';
import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';
import {
  SAVED_OBJECT_DELETE_TIME,
  SAVED_OBJECT_LOADED_TIME,
} from '../../utils/telemetry_constants';
import {
  dashboardListingErrorStrings,
  dashboardListingTableStrings,
} from '../_dashboard_listing_strings';
import { confirmCreateWithUnsaved } from '../confirm_overlays';
import { DashboardListingEmptyPrompt } from '../dashboard_listing_empty_prompt';
import type { DashboardSavedObjectUserContent } from '../types';
import { getDashboardBackupService } from '../../services/dashboard_api_services';

type DashboardActionPermissions = Pick<
  DashboardSavedObjectUserContent,
  'managed' | 'canManageAccessControl' | 'accessMode'
>;

interface UseDashboardListingTableReturnType {
  contentListProviderProps: ContentListClientProviderProps;
  emptyState: ReactNode;
  refreshUnsavedDashboards: () => void;
  unsavedDashboardIds: string[];
}

const getDashboardActionRestriction = (
  item: DashboardActionPermissions,
  showWriteControls: boolean
): string | undefined => {
  if (!showWriteControls) {
    return contentEditorFlyoutStrings.readonlyReason.missingPrivileges;
  }
  if (item.managed) {
    return contentEditorFlyoutStrings.readonlyReason.managedEntity;
  }
  if (item.canManageAccessControl === false && item.accessMode === 'write_restricted') {
    return contentEditorFlyoutStrings.readonlyReason.accessControl;
  }
};

export const useDashboardListingTable = ({
  dashboardListingId = 'dashboard',
  disableCreateDashboardButton,
  getDashboardUrl,
  goToDashboard,
  initialFilter,
  urlStateEnabled,
  useSessionStorageIntegration,
}: {
  dashboardListingId?: string;
  disableCreateDashboardButton?: boolean;
  getDashboardUrl: (dashboardId: string, usesTimeRestore: boolean) => string;
  goToDashboard: (dashboardId?: string, viewMode?: ViewMode) => void;
  initialFilter?: string;
  urlStateEnabled?: boolean;
  useSessionStorageIntegration?: boolean;
}): UseDashboardListingTableReturnType => {
  const { getEntityName, getEntityNamePlural } = dashboardListingTableStrings;
  const entityName = getEntityName();
  const entityNamePlural = getEntityNamePlural();

  const [unsavedDashboardIds, setUnsavedDashboardIds] = useState<string[]>(
    getDashboardBackupService().getDashboardIdsWithUnsavedChanges()
  );

  const accessControlClient = getAccessControlClient();
  const { showWriteControls } = getDashboardCapabilities();

  const createItem = useCallback(() => {
    if (useSessionStorageIntegration && getDashboardBackupService().dashboardHasUnsavedEdits()) {
      confirmCreateWithUnsaved(() => {
        getDashboardBackupService().clearState();
        goToDashboard();
      }, goToDashboard);
      return;
    }
    goToDashboard();
  }, [goToDashboard, useSessionStorageIntegration]);

  const updateItemMeta = useCallback(
    async ({ id, ...updatedState }: Parameters<Required<OpenContentEditorParams>['onSave']>[0]) => {
      const dashboard = await findService.findById(id);
      if (dashboard.status === 'error') {
        return;
      }
      // `access_control` can not be specified as part of the update payload
      const { access_control, ...restOfAttributes } = dashboard.attributes;
      await dashboardClient.update(id, {
        ...restOfAttributes,
        ...updatedState,
      });

      setUnsavedDashboardIds(getDashboardBackupService().getDashboardIdsWithUnsavedChanges());
    },
    []
  );

  const contentEditorValidators: OpenContentEditorParams['customValidators'] = useMemo(
    () => ({
      title: [
        {
          type: 'warning',
          fn: async (value: string, id: string) => {
            if (!id) return;
            try {
              const dashboard = await findService.findById(id);
              if (dashboard.status === 'error') {
                return;
              }

              if (value.toLowerCase() === dashboard.attributes.title.toLowerCase()) {
                return;
              }

              const hasDuplicateTitle = await hasLibraryItemWithTitle(value);

              if (hasDuplicateTitle) {
                return dashboardListingErrorStrings.getDuplicateTitleWarning(value);
              }
            } catch (e) {
              return e.message;
            }
          },
        },
      ],
    }),
    []
  );

  const emptyPrompt = useMemo(
    () => (
      <DashboardListingEmptyPrompt
        createItem={createItem}
        disableCreateDashboardButton={disableCreateDashboardButton}
        goToDashboard={goToDashboard}
        setUnsavedDashboardIds={setUnsavedDashboardIds}
        unsavedDashboardIds={unsavedDashboardIds}
        useSessionStorageIntegration={useSessionStorageIntegration}
      />
    ),
    [
      createItem,
      disableCreateDashboardButton,
      goToDashboard,
      unsavedDashboardIds,
      useSessionStorageIntegration,
    ]
  );

  const findItems = useCallback(
    async (
      searchTerm: string,
      {
        references,
        referencesToExclude,
        listingLimit = PAGINATION_MAX_SIZE,
      }: TableListViewFindItemsOptions = {}
    ) => {
      const searchStartTime = window.performance.now();

      const [userResponse, globalPrivilegeResponse] = await Promise.allSettled([
        coreServices.userProfile.getCurrent(),
        accessControlClient.checkGlobalPrivilege(DASHBOARD_SAVED_OBJECT_TYPE),
      ]);

      const userId = userResponse.status === 'fulfilled' ? userResponse.value.uid : undefined;
      const isGloballyAuthorized =
        globalPrivilegeResponse.status === 'fulfilled'
          ? globalPrivilegeResponse.value.isGloballyAuthorized
          : false;

      return findService
        .search({
          query: searchTerm,
          per_page: Math.min(listingLimit, PAGINATION_MAX_SIZE),
          tags: (references ?? []).map(({ id }) => id),
          excluded_tags: (referencesToExclude ?? []).map(({ id }) => id),
        })
        .then(({ meta: { total }, data: dashboards }) => {
          const searchEndTime = window.performance.now();
          const searchDuration = searchEndTime - searchStartTime;
          reportPerformanceMetricEvent(coreServices.analytics, {
            eventName: SAVED_OBJECT_LOADED_TIME,
            duration: searchDuration,
            meta: {
              saved_object_type: DASHBOARD_SAVED_OBJECT_TYPE,
            },
          });
          const tagApi = savedObjectsTaggingService?.getTaggingApi();

          return {
            total,
            hits: dashboards.map(({ id, data, meta }) => {
              const canManageAccessControl =
                isGloballyAuthorized ||
                accessControlClient.checkUserAccessControl({
                  accessControl: {
                    owner: meta.owner,
                    accessMode: data?.access_control?.access_mode,
                  },
                  createdBy: meta.created_by,
                  userId,
                });

              return {
                type: 'dashboard',
                id,
                updatedAt: meta.updated_at,
                createdAt: meta.created_at,
                createdBy: meta.created_by,
                updatedBy: meta.updated_by,
                references: tagApi && data.tags ? data.tags.map(tagApi.ui.tagIdToReference) : [],
                managed: meta.managed,
                attributes: {
                  title: data.title,
                  description: data.description,
                  timeRestore: Boolean(data.time_range),
                },
                canManageAccessControl,
                accessMode: data?.access_control?.access_mode,
              } as DashboardSavedObjectUserContent;
            }),
          };
        });
    },
    [accessControlClient]
  );

  const contentInsightsClient = useMemo(
    () => new ContentInsightsClient({ http: coreServices.http, logger }, { domainId: 'dashboard' }),
    []
  );

  const recents = useRecentlyAccessedDecoration(getDashboardRecentlyAccessedService());

  const features = useMemo<ContentListClientFeatures>(
    () => ({
      ...(initialFilter && {
        search: { initialSearch: initialFilter },
      }),
      sorting: {
        initialSort: recents.initialSort,
        fields: recents.sortFields,
      },
      urlSync: urlStateEnabled,
      contentEditor: {
        isReadonly: !showWriteControls,
        readonlyReason: !showWriteControls
          ? contentEditorFlyoutStrings.readonlyReason.missingPrivileges
          : undefined,
        onSave: updateItemMeta,
        customValidators: contentEditorValidators,
        appendRows: (contentListItem) => (
          <SavedObjectActivityRow
            service={contentInsightsClient}
            item={contentListItem}
            entityNamePlural={entityNamePlural}
            isKibanaVersioningEnabled={!serverlessService}
          />
        ),
      },
    }),
    [
      contentEditorValidators,
      initialFilter,
      recents.initialSort,
      recents.sortFields,
      showWriteControls,
      updateItemMeta,
      urlStateEnabled,
      contentInsightsClient,
      entityNamePlural,
    ]
  );

  const contentListFindItems = useCallback(
    async (searchTerm: string, options?: TableListViewFindItemsOptions) =>
      recents.decorate(await findItems(searchTerm, options)),
    [findItems, recents]
  );

  const deleteItems = useCallback(async (dashboardsToDelete: Array<{ id: string }>) => {
    try {
      const deleteStartTime = window.performance.now();

      await asyncMap(dashboardsToDelete, async ({ id }) => {
        await dashboardClient.delete(id);
        getDashboardBackupService().clearState(id);
        getDashboardRecentlyAccessedService().remove(id);
        coreServices.chrome.recentlyAccessed.remove(id);
      });

      const deleteDuration = window.performance.now() - deleteStartTime;
      reportPerformanceMetricEvent(coreServices.analytics, {
        eventName: SAVED_OBJECT_DELETE_TIME,
        duration: deleteDuration,
        meta: {
          saved_object_type: DASHBOARD_SAVED_OBJECT_TYPE,
          total: dashboardsToDelete.length,
        },
      });
    } catch (error) {
      coreServices.notifications.toasts.addError(error, {
        title: dashboardListingErrorStrings.getErrorDeletingDashboardToast(),
      });
    }

    setUnsavedDashboardIds(getDashboardBackupService().getDashboardIdsWithUnsavedChanges());
  }, []);

  const editItem = useCallback(
    ({ id }: { id: string | undefined }) => goToDashboard(id, 'edit'),
    [goToDashboard]
  );

  const item = useMemo<ContentListItemConfig>(() => {
    const restriction = (contentListItem: ContentListItem) =>
      getDashboardActionRestriction(contentListItem, showWriteControls);
    return {
      getHref: (contentListItem) => {
        const { id, timeRestore } = contentListItem;
        return getDashboardUrl(id, timeRestore === true);
      },
      actions: {
        edit: {
          onItemAction: editItem,
          restriction,
        },
        delete: {
          onBulkAction: deleteItems,
          restriction,
        },
      },
    };
  }, [deleteItems, editItem, getDashboardUrl, showWriteControls]);

  const services = useMemo<ContentListClientServices>(() => {
    const savedObjectsTagging = savedObjectsTaggingService?.getTaggingApi();
    return {
      tags: createTagsService(savedObjectsTagging?.ui),
      userProfiles: createUserProfilesService(coreServices.userProfile),
      savedObjectsTagging,
    };
  }, []);

  const contentListProviderProps = useMemo<ContentListClientProviderProps>(
    () => ({
      id: dashboardListingId,
      core: coreServices,
      labels: {
        entity: entityName,
        entityPlural: entityNamePlural,
      },
      findItems: contentListFindItems,
      isReadOnly: !showWriteControls,
      item,
      services,
      features,
    }),
    [
      dashboardListingId,
      entityName,
      entityNamePlural,
      contentListFindItems,
      showWriteControls,
      item,
      services,
      features,
    ]
  );

  const refreshUnsavedDashboards = useCallback(
    () => setUnsavedDashboardIds(getDashboardBackupService().getDashboardIdsWithUnsavedChanges()),
    []
  );

  return {
    contentListProviderProps,
    emptyState: emptyPrompt,
    refreshUnsavedDashboards,
    unsavedDashboardIds,
  };
};
