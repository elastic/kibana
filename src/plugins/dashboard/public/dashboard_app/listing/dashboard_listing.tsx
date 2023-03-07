/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useMount from 'react-use/lib/useMount';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  EuiLink,
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { SavedObjectsFindOptionsReference, SimpleSavedObject } from '@kbn/core/public';
import { TableListView, type UserContentCommonSchema } from '@kbn/content-management-table-list';

import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { SAVED_OBJECT_DELETE_TIME, SAVED_OBJECT_LOADED_TIME } from '../../dashboard_constants';

import {
  getDashboardBreadcrumb,
  dashboardListingTableStrings,
  noItemsStrings,
  dashboardUnsavedListingStrings,
  getNewDashboardTitle,
  dashboardListingErrorStrings,
} from '../_dashboard_app_strings';
import {
  DashboardAppNoDataPage,
  isDashboardAppInNoDataState,
} from '../no_data/dashboard_app_no_data';
import { DashboardRedirect } from '../types';
import { DashboardAttributes } from '../../../common';
import { pluginServices } from '../../services/plugin_services';
import { DashboardUnsavedListing } from './dashboard_unsaved_listing';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../dashboard_constants';
import { getDashboardListItemLink } from './get_dashboard_list_item_link';
import { confirmCreateWithUnsaved, confirmDiscardUnsavedChanges } from './confirm_overlays';
import { DASHBOARD_PANELS_UNSAVED_ID } from '../../services/dashboard_session_storage/dashboard_session_storage_service';

const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';
const SAVED_OBJECTS_PER_PAGE_SETTING = 'savedObjects:perPage';

interface DashboardSavedObjectUserContent extends UserContentCommonSchema {
  attributes: {
    title: string;
    description?: string;
    timeRestore: boolean;
  };
}

const toTableListViewSavedObject = (
  savedObject: SimpleSavedObject<DashboardAttributes>
): DashboardSavedObjectUserContent => {
  const { title, description, timeRestore } = savedObject.attributes;
  return {
    type: 'dashboard',
    id: savedObject.id,
    updatedAt: savedObject.updatedAt!,
    references: savedObject.references,
    attributes: {
      title,
      description,
      timeRestore,
    },
  };
};

export interface DashboardListingProps {
  kbnUrlStateStorage: IKbnUrlStateStorage;
  redirectTo: DashboardRedirect;
  initialFilter?: string;
  title?: string;
}

export const DashboardListing = ({
  title,
  redirectTo,
  initialFilter,
  kbnUrlStateStorage,
}: DashboardListingProps) => {
  const {
    application,
    data: { query },
    dashboardSessionStorage,
    settings: { uiSettings },
    notifications: { toasts },
    chrome: { setBreadcrumbs },
    coreContext: { executionContext },
    dashboardCapabilities: { showWriteControls },
    dashboardSavedObject: { findDashboards, savedObjectsClient },
  } = pluginServices.getServices();

  const [showNoDataPage, setShowNoDataPage] = useState<boolean>(false);
  useMount(() => {
    (async () => setShowNoDataPage(await isDashboardAppInNoDataState()))();
  });

  const [unsavedDashboardIds, setUnsavedDashboardIds] = useState<string[]>(
    dashboardSessionStorage.getDashboardIdsWithUnsavedChanges()
  );

  useExecutionContext(executionContext, {
    type: 'application',
    page: 'list',
  });

  // Set breadcrumbs useEffect
  useEffect(() => {
    setBreadcrumbs([
      {
        text: getDashboardBreadcrumb(),
      },
    ]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    // syncs `_g` portion of url with query services
    const { stop: stopSyncingQueryServiceStateWithUrl } = syncGlobalQueryStateWithUrl(
      query,
      kbnUrlStateStorage
    );
    if (title) {
      findDashboards.findByTitle(title).then((result) => {
        if (!result) return;
        redirectTo({
          destination: 'dashboard',
          id: result.id,
          useReplace: true,
        });
      });
    }

    return () => {
      stopSyncingQueryServiceStateWithUrl();
    };
  }, [title, redirectTo, query, kbnUrlStateStorage, findDashboards]);

  const listingLimit = uiSettings.get(SAVED_OBJECTS_LIMIT_SETTING);
  const initialPageSize = uiSettings.get(SAVED_OBJECTS_PER_PAGE_SETTING);
  const defaultFilter = title ? `${title}` : '';

  const createItem = useCallback(() => {
    if (!dashboardSessionStorage.dashboardHasUnsavedEdits()) {
      redirectTo({ destination: 'dashboard' });
    } else {
      confirmCreateWithUnsaved(
        () => {
          dashboardSessionStorage.clearState();
          redirectTo({ destination: 'dashboard' });
        },
        () => redirectTo({ destination: 'dashboard' })
      );
    }
  }, [dashboardSessionStorage, redirectTo]);

  const emptyPrompt = useMemo(() => {
    if (!showWriteControls) {
      return (
        <EuiEmptyPrompt
          iconType="glasses"
          title={
            <h1 id="dashboardListingHeading" data-test-subj="emptyListPrompt">
              {noItemsStrings.getReadonlyTitle()}
            </h1>
          }
          body={<p>{noItemsStrings.getReadonlyBody()}</p>}
        />
      );
    }

    const isEditingFirstDashboard = unsavedDashboardIds.length === 1;

    const emptyAction = isEditingFirstDashboard ? (
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            color="danger"
            onClick={() =>
              confirmDiscardUnsavedChanges(() => {
                dashboardSessionStorage.clearState(DASHBOARD_PANELS_UNSAVED_ID);
                setUnsavedDashboardIds(dashboardSessionStorage.getDashboardIdsWithUnsavedChanges());
              })
            }
            data-test-subj="discardDashboardPromptButton"
            aria-label={dashboardUnsavedListingStrings.getDiscardAriaLabel(getNewDashboardTitle())}
          >
            {dashboardUnsavedListingStrings.getDiscardTitle()}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType="pencil"
            color="primary"
            onClick={() => redirectTo({ destination: 'dashboard' })}
            data-test-subj="newItemButton"
            aria-label={dashboardUnsavedListingStrings.getEditAriaLabel(getNewDashboardTitle())}
          >
            {dashboardUnsavedListingStrings.getEditTitle()}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      <EuiButton onClick={createItem} fill iconType="plusInCircle" data-test-subj="newItemButton">
        {noItemsStrings.getCreateNewDashboardText()}
      </EuiButton>
    );

    return (
      <EuiEmptyPrompt
        iconType="dashboardApp"
        title={
          <h1 id="dashboardListingHeading" data-test-subj="emptyListPrompt">
            {isEditingFirstDashboard
              ? noItemsStrings.getReadEditInProgressTitle()
              : noItemsStrings.getReadEditTitle()}
          </h1>
        }
        body={
          <>
            <p>{noItemsStrings.getReadEditDashboardDescription()}</p>
            {!isEditingFirstDashboard && (
              <p>
                <FormattedMessage
                  id="dashboard.listing.createNewDashboard.newToKibanaDescription"
                  defaultMessage="New to Kibana? {sampleDataInstallLink} to take a test drive."
                  values={{
                    sampleDataInstallLink: (
                      <EuiLink
                        onClick={() =>
                          application.navigateToApp('home', {
                            path: '#/tutorial_directory/sampleData',
                          })
                        }
                      >
                        {noItemsStrings.getSampleDataLinkText()}
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            )}
          </>
        }
        actions={emptyAction}
      />
    );
  }, [
    redirectTo,
    createItem,
    application,
    showWriteControls,
    unsavedDashboardIds,
    dashboardSessionStorage,
  ]);

  const fetchItems = useCallback(
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
        .findSavedObjects({
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
              saved_object_type: DASHBOARD_SAVED_OBJECT_TYPE,
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

        await Promise.all(
          dashboardsToDelete.map(({ id }) => {
            dashboardSessionStorage.clearState(id);
            return savedObjectsClient.delete(DASHBOARD_SAVED_OBJECT_TYPE, id);
          })
        );

        const deleteDuration = window.performance.now() - deleteStartTime;
        reportPerformanceMetricEvent(pluginServices.getServices().analytics, {
          eventName: SAVED_OBJECT_DELETE_TIME,
          duration: deleteDuration,
          meta: {
            saved_object_type: DASHBOARD_SAVED_OBJECT_TYPE,
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
    [savedObjectsClient, dashboardSessionStorage, toasts]
  );

  const editItem = useCallback(
    ({ id }: { id: string | undefined }) =>
      redirectTo({ destination: 'dashboard', id, editMode: true }),
    [redirectTo]
  );

  const { getEntityName, getTableListTitle, getEntityNamePlural } = dashboardListingTableStrings;
  return (
    <>
      {showNoDataPage && (
        <DashboardAppNoDataPage onDataViewCreated={() => setShowNoDataPage(false)} />
      )}
      {!showNoDataPage && (
        <TableListView<DashboardSavedObjectUserContent>
          createItem={!showWriteControls ? undefined : createItem}
          deleteItems={!showWriteControls ? undefined : deleteItems}
          initialPageSize={initialPageSize}
          editItem={!showWriteControls ? undefined : editItem}
          initialFilter={initialFilter ?? defaultFilter}
          headingId="dashboardListingHeading"
          findItems={fetchItems}
          entityNamePlural={getEntityNamePlural()}
          tableListTitle={getTableListTitle()}
          entityName={getEntityName()}
          {...{
            emptyPrompt,
            listingLimit,
          }}
          id="dashboard"
          getDetailViewLink={({ id, attributes: { timeRestore } }) =>
            getDashboardListItemLink(kbnUrlStateStorage, id, timeRestore)
          }
        >
          <DashboardUnsavedListing
            redirectTo={redirectTo}
            unsavedDashboardIds={unsavedDashboardIds}
            refreshUnsavedDashboards={() =>
              setUnsavedDashboardIds(dashboardSessionStorage.getDashboardIdsWithUnsavedChanges())
            }
          />
        </TableListView>
      )}
    </>
  );
};
