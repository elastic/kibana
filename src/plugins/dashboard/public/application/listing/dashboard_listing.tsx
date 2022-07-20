/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiLink,
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SavedObjectsFindOptionsReference, SimpleSavedObject } from '@kbn/core/public';
import { useExecutionContext, toMountPoint } from '@kbn/kibana-react-plugin/public';
import { TableListViewKibanaProvider, TableListView } from '@kbn/content-management-table-list';
import useMount from 'react-use/lib/useMount';
import { attemptLoadDashboardByTitle } from '../lib';
import {
  DashboardAppServices,
  DashboardRedirect,
  DashboardSavedObjectUserContent,
} from '../../types';
import {
  getDashboardBreadcrumb,
  dashboardListingTable,
  noItemsStrings,
  dashboardUnsavedListingStrings,
  getNewDashboardTitle,
} from '../../dashboard_strings';
import { DashboardAttributes } from '../../saved_dashboards';
import { syncQueryStateWithUrl } from '../../services/data';
import { IKbnUrlStateStorage } from '../../services/kibana_utils';
import { useKibana } from '../../services/kibana_react';
import { DashboardUnsavedListing } from './dashboard_unsaved_listing';
import { confirmCreateWithUnsaved, confirmDiscardUnsavedChanges } from './confirm_overlays';
import { getDashboardListItemLink } from './get_dashboard_list_item_link';
import { DASHBOARD_PANELS_UNSAVED_ID } from '../lib/dashboard_session_storage';
import { DashboardAppNoDataPage, isDashboardAppInNoDataState } from '../dashboard_app_no_data';

const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';
const SAVED_OBJECTS_PER_PAGE_SETTING = 'savedObjects:perPage';

export interface DashboardListingProps {
  kbnUrlStateStorage: IKbnUrlStateStorage;
  redirectTo: DashboardRedirect;
  initialFilter?: string;
  title?: string;
}

const toTableListViewSavedObject = (
  savedObject: SimpleSavedObject<DashboardAttributes>
): DashboardSavedObjectUserContent => {
  return {
    ...savedObject,
    attributes: {
      ...savedObject.attributes,
      title: savedObject.attributes.title ?? '',
      description: savedObject.attributes.description ?? '',
    },
  };
};

export const DashboardListing = ({
  title,
  redirectTo,
  initialFilter,
  kbnUrlStateStorage,
}: DashboardListingProps) => {
  const {
    services: {
      core,
      data,
      dataViews,
      savedDashboards,
      savedObjectsClient,
      savedObjectsTagging,
      dashboardCapabilities,
      dashboardSessionStorage,
      chrome: { setBreadcrumbs },
    },
  } = useKibana<DashboardAppServices>();
  const [showNoDataPage, setShowNoDataPage] = useState<boolean>(false);
  useMount(() => {
    (async () => setShowNoDataPage(await isDashboardAppInNoDataState(dataViews)))();
  });

  const [unsavedDashboardIds, setUnsavedDashboardIds] = useState<string[]>(
    dashboardSessionStorage.getDashboardIdsWithUnsavedChanges()
  );

  useExecutionContext(core.executionContext, {
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
    const { stop: stopSyncingQueryServiceStateWithUrl } = syncQueryStateWithUrl(
      data.query,
      kbnUrlStateStorage
    );
    if (title) {
      attemptLoadDashboardByTitle(title, savedObjectsClient).then((result) => {
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
  }, [title, savedObjectsClient, redirectTo, data.query, kbnUrlStateStorage]);

  const { showWriteControls } = dashboardCapabilities;
  const listingLimit = core.uiSettings.get(SAVED_OBJECTS_LIMIT_SETTING);
  const initialPageSize = core.uiSettings.get(SAVED_OBJECTS_PER_PAGE_SETTING);
  const defaultFilter = title ? `"${title}"` : '';

  const createItem = useCallback(() => {
    if (!dashboardSessionStorage.dashboardHasUnsavedEdits()) {
      redirectTo({ destination: 'dashboard' });
    } else {
      confirmCreateWithUnsaved(
        core.overlays,
        core.theme,
        () => {
          dashboardSessionStorage.clearState();
          redirectTo({ destination: 'dashboard' });
        },
        () => redirectTo({ destination: 'dashboard' })
      );
    }
  }, [dashboardSessionStorage, redirectTo, core.overlays, core.theme]);

  const emptyPrompt = useMemo(() => {
    if (!showWriteControls) {
      return (
        <EuiEmptyPrompt
          iconType="glasses"
          title={<h1 id="dashboardListingHeading">{noItemsStrings.getReadonlyTitle()}</h1>}
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
              confirmDiscardUnsavedChanges(core.overlays, () => {
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
            data-test-subj="createDashboardPromptButton"
            aria-label={dashboardUnsavedListingStrings.getEditAriaLabel(getNewDashboardTitle())}
          >
            {dashboardUnsavedListingStrings.getEditTitle()}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      <EuiButton
        onClick={createItem}
        fill
        iconType="plusInCircle"
        data-test-subj="createDashboardPromptButton"
      >
        {noItemsStrings.getCreateNewDashboardText()}
      </EuiButton>
    );

    return (
      <EuiEmptyPrompt
        iconType="dashboardApp"
        title={
          <h1 id="dashboardListingHeading">
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
                          core.application.navigateToApp('home', {
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
    core.overlays,
    core.application,
    showWriteControls,
    unsavedDashboardIds,
    dashboardSessionStorage,
  ]);

  const fetchItems = useCallback(
    (searchTerm: string, references?: SavedObjectsFindOptionsReference[]) => {
      return savedDashboards
        .find(searchTerm, {
          hasReference: references,
          size: listingLimit,
        })
        .then(({ total, hits }) => {
          return {
            total,
            hits: hits.map(toTableListViewSavedObject),
          };
        });
    },
    [savedDashboards, listingLimit]
  );

  const deleteItems = useCallback(
    (dashboards: Array<{ id: string }>) => {
      dashboards.map((d) => dashboardSessionStorage.clearState(d.id));
      setUnsavedDashboardIds(dashboardSessionStorage.getDashboardIdsWithUnsavedChanges());
      return savedDashboards.delete(dashboards.map((d) => d.id));
    },
    [savedDashboards, dashboardSessionStorage]
  );

  const editItem = useCallback(
    ({ id }: { id: string | undefined }) =>
      redirectTo({ destination: 'dashboard', id, editMode: true }),
    [redirectTo]
  );

  const searchFilters = useMemo(() => {
    // return savedObjectsTagging
    //   ? [savedObjectsTagging.ui.getSearchBarFilter({ useName: true })]
    //   : [];
    return [];
  }, []); // savedObjectsTagging

  const { getEntityName, getTableCaption, getTableListTitle, getEntityNamePlural } =
    dashboardListingTable;
  return (
    <>
      {showNoDataPage && (
        <DashboardAppNoDataPage onDataViewCreated={() => setShowNoDataPage(false)} />
      )}
      {!showNoDataPage && (
        <TableListViewKibanaProvider
          savedObjectTaggingApi={savedObjectsTagging!}
          applicationStart={{
            getUrlForApp: core.application.getUrlForApp,
            capabilities: {
              advancedSettings: core.application.capabilities.advancedSettings,
            },
          }}
          kibanaReactToMountPoint={toMountPoint}
          themeServiceStart={core.theme}
          toastStart={core.notifications.toasts}
        >
          <TableListView<DashboardSavedObjectUserContent>
            createItem={!showWriteControls ? undefined : createItem}
            deleteItems={!showWriteControls ? undefined : deleteItems}
            initialPageSize={initialPageSize}
            editItem={!showWriteControls ? undefined : editItem}
            initialFilter={initialFilter ?? defaultFilter}
            headingId="dashboardListingHeading"
            findItems={fetchItems}
            rowHeader="title"
            getDetailViewLink={(dashboard) =>
              getDashboardListItemLink(
                core.application,
                kbnUrlStateStorage,
                core.uiSettings.get('state:storeInSessionStorage'),
                dashboard.id,
                dashboard.attributes.timeRestore
              )
            }
            entityNamePlural={getEntityNamePlural()}
            tableListTitle={getTableListTitle()}
            tableCaption={getTableCaption()}
            entityName={getEntityName()}
            {...{
              emptyPrompt,
              searchFilters,
              listingLimit,
            }}
          >
            <DashboardUnsavedListing
              redirectTo={redirectTo}
              unsavedDashboardIds={unsavedDashboardIds}
              refreshUnsavedDashboards={() =>
                setUnsavedDashboardIds(dashboardSessionStorage.getDashboardIdsWithUnsavedChanges())
              }
            />
          </TableListView>
        </TableListViewKibanaProvider>
      )}
    </>
  );
};
