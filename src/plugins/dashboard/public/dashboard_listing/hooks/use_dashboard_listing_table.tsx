/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState, useMemo } from 'react';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type { SavedObjectsFindOptionsReference } from '@kbn/core/public';
import { OpenContentEditorParams } from '@kbn/content-management-content-editor';
import { TableListViewTableProps } from '@kbn/content-management-table-list-view-table';

import {
  DASHBOARD_CONTENT_ID,
  SAVED_OBJECT_DELETE_TIME,
  SAVED_OBJECT_LOADED_TIME,
} from '../../dashboard_constants';
import {
  dashboardListingErrorStrings,
  dashboardListingTableStrings,
} from '../_dashboard_listing_strings';
import { DashboardContainerInput } from '../../../common';
import { DashboardSavedObjectUserContent } from '../types';
import { confirmCreateWithUnsaved } from '../confirm_overlays';
import { pluginServices } from '../../services/plugin_services';
import { DashboardItem } from '../../../common/content_management';
import { DashboardListingEmptyPrompt } from '../dashboard_listing_empty_prompt';

type GetDetailViewLink =
  TableListViewTableProps<DashboardSavedObjectUserContent>['getDetailViewLink'];

const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';
const SAVED_OBJECTS_PER_PAGE_SETTING = 'savedObjects:perPage';

const toTableListViewSavedObject = (hit: DashboardItem): DashboardSavedObjectUserContent => {
  const { title, description, timeRestore } = hit.attributes;
  return {
    type: 'dashboard',
    id: hit.id,
    updatedAt: hit.updatedAt!,
    references: hit.references,
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
  const {
    dashboardBackup,
    dashboardCapabilities: { showWriteControls },
    settings: { uiSettings },
    dashboardContentManagement: {
      findDashboards,
      deleteDashboards,
      updateDashboardMeta,
      checkForDuplicateDashboardTitle,
    },
    notifications: { toasts },
  } = pluginServices.getServices();

  const { getEntityName, getTableListTitle, getEntityNamePlural } = dashboardListingTableStrings;
  const title = getTableListTitle();
  const entityName = getEntityName();
  const entityNamePlural = getEntityNamePlural();
  const [pageDataTestSubject, setPageDataTestSubject] = useState<string>();
  const [hasInitialFetchReturned, setHasInitialFetchReturned] = useState(false);
  const [unsavedDashboardIds, setUnsavedDashboardIds] = useState<string[]>(
    dashboardBackup.getDashboardIdsWithUnsavedChanges()
  );

  const listingLimit = uiSettings.get(SAVED_OBJECTS_LIMIT_SETTING);
  const initialPageSize = uiSettings.get(SAVED_OBJECTS_PER_PAGE_SETTING);

  const createItem = useCallback(() => {
    if (useSessionStorageIntegration && dashboardBackup.dashboardHasUnsavedEdits()) {
      confirmCreateWithUnsaved(() => {
        dashboardBackup.clearState();
        goToDashboard();
      }, goToDashboard);
      return;
    }
    goToDashboard();
  }, [dashboardBackup, goToDashboard, useSessionStorageIntegration]);

  const updateItemMeta = useCallback(
    async (props: Pick<DashboardContainerInput, 'id' | 'title' | 'description' | 'tags'>) => {
      await updateDashboardMeta(props);

      setUnsavedDashboardIds(dashboardBackup.getDashboardIdsWithUnsavedChanges());
    },
    [dashboardBackup, updateDashboardMeta]
  );

  const contentEditorValidators: OpenContentEditorParams['customValidators'] = useMemo(
    () => ({
      title: [
        {
          type: 'warning',
          fn: async (value: string, id: string) => {
            if (id) {
              try {
                const [dashboard] = await findDashboards.findByIds([id]);
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
    [checkForDuplicateDashboardTitle, findDashboards]
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

      return findDashboards
        .search({
          search: searchTerm,
          size: listingLimit,
          hasReference: references,
          hasNoReference: referencesToExclude,
        })
        .then(({ total, hits }) => {
          const searchEndTime = window.performance.now();
          const searchDuration = searchEndTime - searchStartTime;
          reportPerformanceMetricEvent(pluginServices.getServices().analytics, {
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
    [findDashboards, listingLimit]
  );

  const deleteItems = useCallback(
    async (dashboardsToDelete: Array<{ id: string }>) => {
      try {
        const deleteStartTime = window.performance.now();

        await deleteDashboards(
          dashboardsToDelete.map(({ id }) => {
            dashboardBackup.clearState(id);
            return id;
          })
        );

        const deleteDuration = window.performance.now() - deleteStartTime;
        reportPerformanceMetricEvent(pluginServices.getServices().analytics, {
          eventName: SAVED_OBJECT_DELETE_TIME,
          duration: deleteDuration,
          meta: {
            saved_object_type: DASHBOARD_CONTENT_ID,
            total: dashboardsToDelete.length,
          },
        });
      } catch (error) {
        toasts.addError(error, {
          title: dashboardListingErrorStrings.getErrorDeletingDashboardToast(),
        });
      }

      setUnsavedDashboardIds(dashboardBackup.getDashboardIdsWithUnsavedChanges());
    },
    [dashboardBackup, deleteDashboards, toasts]
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

  const getDetailViewLink: GetDetailViewLink = useCallback(
    ({ id, attributes: { timeRestore } }) => getDashboardUrl(id, timeRestore),
    [getDashboardUrl]
  );

  const tableListViewTableProps: DashboardListingViewTableProps = useMemo(
    () => ({
      contentEditor: {
        isReadonly: !showWriteControls,
        onSave: updateItemMeta,
        customValidators: contentEditorValidators,
      },
      createItem: !showWriteControls || !showCreateDashboardButton ? undefined : createItem,
      deleteItems: !showWriteControls ? undefined : deleteItems,
      editItem: !showWriteControls ? undefined : editItem,
      itemIsEditable: () => showWriteControls,
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
    }),
    [
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
      showWriteControls,
      title,
      updateItemMeta,
      urlStateEnabled,
    ]
  );

  const refreshUnsavedDashboards = useCallback(
    () => setUnsavedDashboardIds(dashboardBackup.getDashboardIdsWithUnsavedChanges()),
    [dashboardBackup]
  );

  return {
    hasInitialFetchReturned,
    pageDataTestSubject,
    refreshUnsavedDashboards,
    tableListViewTableProps,
    unsavedDashboardIds,
  };
};
