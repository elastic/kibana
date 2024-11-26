/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';

import { OpenContentEditorParams } from '@kbn/content-management-content-editor';
import { ContentInsightsClient } from '@kbn/content-management-content-insights-public';
import { TableListViewTableProps } from '@kbn/content-management-table-list-view-table';
import type { SavedObjectsFindOptionsReference } from '@kbn/core/public';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { ViewMode } from '@kbn/embeddable-plugin/public';

import { DashboardContainerInput } from '../../../common';
import type { DashboardSearchOut } from '../../../server/content_management';
import {
  DASHBOARD_CONTENT_ID,
  SAVED_OBJECT_DELETE_TIME,
  SAVED_OBJECT_LOADED_TIME,
} from '../../dashboard_constants';
import { getDashboardBackupService } from '../../services/dashboard_backup_service';
import { getDashboardContentManagementService } from '../../services/dashboard_content_management_service';
import { getDashboardRecentlyAccessedService } from '../../services/dashboard_recently_accessed_service';
import { coreServices } from '../../services/kibana_services';
import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';
import {
  dashboardListingErrorStrings,
  dashboardListingTableStrings,
} from '../_dashboard_listing_strings';
import { confirmCreateWithUnsaved } from '../confirm_overlays';
import { DashboardListingEmptyPrompt } from '../dashboard_listing_empty_prompt';
import { DashboardSavedObjectUserContent } from '../types';

type GetDetailViewLink =
  TableListViewTableProps<DashboardSavedObjectUserContent>['getDetailViewLink'];

const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';
const SAVED_OBJECTS_PER_PAGE_SETTING = 'savedObjects:perPage';

const toTableListViewSavedObject = (
  hit: DashboardSearchOut['hits'][number]
): DashboardSavedObjectUserContent => {
  const { title, description, timeRestore } = hit.attributes;
  return {
    type: 'dashboard',
    id: hit.id,
    updatedAt: hit.updatedAt!,
    createdAt: hit.createdAt,
    createdBy: hit.createdBy,
    updatedBy: hit.updatedBy,
    references: hit.references ?? [],
    managed: hit.managed,
    attributes: {
      title,
      description,
      timeRestore,
    },
  };
};

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
  const title = getTableListTitle();
  const entityName = getEntityName();
  const entityNamePlural = getEntityNamePlural();
  const [pageDataTestSubject, setPageDataTestSubject] = useState<string>();
  const [hasInitialFetchReturned, setHasInitialFetchReturned] = useState(false);

  const dashboardBackupService = useMemo(() => getDashboardBackupService(), []);
  const dashboardContentManagementService = useMemo(
    () => getDashboardContentManagementService(),
    []
  );

  const [unsavedDashboardIds, setUnsavedDashboardIds] = useState<string[]>(
    dashboardBackupService.getDashboardIdsWithUnsavedChanges()
  );

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
    async (props: Pick<DashboardContainerInput, 'id' | 'title' | 'description' | 'tags'>) => {
      await dashboardContentManagementService.updateDashboardMeta(props);

      setUnsavedDashboardIds(dashboardBackupService.getDashboardIdsWithUnsavedChanges());
    },
    [dashboardBackupService, dashboardContentManagementService]
  );

  const contentEditorValidators: OpenContentEditorParams['customValidators'] = useMemo(
    () => ({
      title: [
        {
          type: 'warning',
          fn: async (value: string, id: string) => {
            if (id) {
              try {
                const [dashboard] =
                  await dashboardContentManagementService.findDashboards.findByIds([id]);
                if (dashboard.status === 'error') {
                  return;
                }

                const validTitle =
                  await dashboardContentManagementService.checkForDuplicateDashboardTitle({
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
    [dashboardContentManagementService]
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
    (
      searchTerm: string,
      {
        references,
        referencesToExclude,
      }: {
        references?: SavedObjectsFindOptionsReference[];
        referencesToExclude?: SavedObjectsFindOptionsReference[];
      } = {}
    ) => {
      const searchStartTime = window.performance.now();

      return dashboardContentManagementService.findDashboards
        .search({
          search: searchTerm,
          size: listingLimit,
          hasReference: references,
          hasNoReference: referencesToExclude,
          options: {
            // include only tags references in the response to save bandwidth
            includeReferences: ['tag'],
          },
        })
        .then(({ total, hits }) => {
          const searchEndTime = window.performance.now();
          const searchDuration = searchEndTime - searchStartTime;
          reportPerformanceMetricEvent(coreServices.analytics, {
            eventName: SAVED_OBJECT_LOADED_TIME,
            duration: searchDuration,
            meta: {
              saved_object_type: DASHBOARD_CONTENT_ID,
            },
          });
          return {
            total,
            hits: hits.map(toTableListViewSavedObject),
          };
        });
    },
    [listingLimit, dashboardContentManagementService]
  );

  const deleteItems = useCallback(
    async (dashboardsToDelete: Array<{ id: string }>) => {
      try {
        const deleteStartTime = window.performance.now();

        await dashboardContentManagementService.deleteDashboards(
          dashboardsToDelete.map(({ id }) => {
            dashboardBackupService.clearState(id);
            return id;
          })
        );

        const deleteDuration = window.performance.now() - deleteStartTime;
        reportPerformanceMetricEvent(coreServices.analytics, {
          eventName: SAVED_OBJECT_DELETE_TIME,
          duration: deleteDuration,
          meta: {
            saved_object_type: DASHBOARD_CONTENT_ID,
            total: dashboardsToDelete.length,
          },
        });
      } catch (error) {
        coreServices.notifications.toasts.addError(error, {
          title: dashboardListingErrorStrings.getErrorDeletingDashboardToast(),
        });
      }

      setUnsavedDashboardIds(dashboardBackupService.getDashboardIdsWithUnsavedChanges());
    },
    [dashboardBackupService, dashboardContentManagementService]
  );

  const editItem = useCallback(
    ({ id }: { id: string | undefined }) => goToDashboard(id, ViewMode.EDIT),
    [goToDashboard]
  );

  const onFetchSuccess = useCallback(() => {
    if (!hasInitialFetchReturned) {
      setHasInitialFetchReturned(true);
    }
  }, [hasInitialFetchReturned]);

  const getDetailViewLink = useCallback<NonNullable<GetDetailViewLink>>(
    ({ id, attributes: { timeRestore } }) => getDashboardUrl(id, timeRestore),
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
      emptyPrompt,
      entityName,
      entityNamePlural,
      findItems,
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
    };
  }, [
    contentEditorValidators,
    createItem,
    dashboardListingId,
    deleteItems,
    editItem,
    emptyPrompt,
    entityName,
    entityNamePlural,
    findItems,
    getDetailViewLink,
    headingId,
    initialFilter,
    initialPageSize,
    listingLimit,
    onFetchSuccess,
    showCreateDashboardButton,
    title,
    updateItemMeta,
    urlStateEnabled,
  ]);

  const refreshUnsavedDashboards = useCallback(
    () => setUnsavedDashboardIds(getDashboardBackupService().getDashboardIdsWithUnsavedChanges()),
    []
  );

  const contentInsightsClient = useMemo(
    () => new ContentInsightsClient({ http: coreServices.http }, { domainId: 'dashboard' }),
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
