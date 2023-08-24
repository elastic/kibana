/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState, useMemo } from 'react';
import type { SavedObjectsFindOptionsReference } from '@kbn/core/public';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { TableListViewTableProps } from '@kbn/content-management-table-list-view-table';
import { ViewMode } from '@kbn/embeddable-plugin/public';

import { OpenContentEditorParams } from '@kbn/content-management-content-editor';
import { DashboardContainerInput } from '../../../common';
import { DashboardListingEmptyPrompt } from '../dashboard_listing_empty_prompt';
import { pluginServices } from '../../services/plugin_services';
import {
  DASHBOARD_CONTENT_ID,
  SAVED_OBJECT_DELETE_TIME,
  SAVED_OBJECT_LOADED_TIME,
} from '../../dashboard_constants';
import { DashboardItem } from '../../../common/content_management';
import {
  dashboardListingErrorStrings,
  dashboardListingTableStrings,
} from '../_dashboard_listing_strings';
import { confirmCreateWithUnsaved } from '../confirm_overlays';
import { DashboardSavedObjectUserContent } from '../types';

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
    attributes: {
      title,
      description,
      timeRestore,
    },
  };
};

interface UseDashboardListingTableReturnType {
  hasInitialFetchReturned: boolean;
  pageDataTestSubject: string | undefined;
  refreshUnsavedDashboards: () => void;
  tableListViewTableProps: Omit<
    TableListViewTableProps<DashboardSavedObjectUserContent>,
    'tableCaption'
  > & { title: string };
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
}: {
  dashboardListingId?: string;
  disableCreateDashboardButton?: boolean;
  getDashboardUrl: (dashboardId: string, usesTimeRestore: boolean) => string;
  goToDashboard: (dashboardId?: string, viewMode?: ViewMode) => void;
  headingId?: string;
  initialFilter?: string;
  urlStateEnabled?: boolean;
  useSessionStorageIntegration?: boolean;
}): UseDashboardListingTableReturnType => {
  const {
    dashboardSessionStorage,
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
    dashboardSessionStorage.getDashboardIdsWithUnsavedChanges()
  );

  const listingLimit = uiSettings.get(SAVED_OBJECTS_LIMIT_SETTING);
  const initialPageSize = uiSettings.get(SAVED_OBJECTS_PER_PAGE_SETTING);

  const createItem = useCallback(() => {
    if (useSessionStorageIntegration && dashboardSessionStorage.dashboardHasUnsavedEdits()) {
      confirmCreateWithUnsaved(() => {
        dashboardSessionStorage.clearState();
        goToDashboard();
      }, goToDashboard);
      return;
    }
    goToDashboard();
  }, [dashboardSessionStorage, goToDashboard, useSessionStorageIntegration]);

  const updateItemMeta = useCallback(
    async (props: Pick<DashboardContainerInput, 'id' | 'title' | 'description' | 'tags'>) => {
      await updateDashboardMeta(props);

      setUnsavedDashboardIds(dashboardSessionStorage.getDashboardIdsWithUnsavedChanges());
    },
    [dashboardSessionStorage, updateDashboardMeta]
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
            dashboardSessionStorage.clearState(id);
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

      setUnsavedDashboardIds(dashboardSessionStorage.getDashboardIdsWithUnsavedChanges());
    },
    [dashboardSessionStorage, deleteDashboards, toasts]
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

  const tableListViewTableProps = useMemo(
    () => ({
      contentEditor: {
        isReadonly: !showWriteControls,
        onSave: updateItemMeta,
        customValidators: contentEditorValidators,
      },
      createItem: !showWriteControls ? undefined : createItem,
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
      showWriteControls,
      title,
      updateItemMeta,
      urlStateEnabled,
    ]
  );

  const refreshUnsavedDashboards = useCallback(
    () => setUnsavedDashboardIds(dashboardSessionStorage.getDashboardIdsWithUnsavedChanges()),
    [dashboardSessionStorage]
  );

  return {
    hasInitialFetchReturned,
    pageDataTestSubject,
    refreshUnsavedDashboards,
    tableListViewTableProps,
    unsavedDashboardIds,
  };
};
