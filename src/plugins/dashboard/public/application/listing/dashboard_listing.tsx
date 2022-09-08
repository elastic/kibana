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
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ApplicationStart, SavedObjectsFindOptionsReference } from '@kbn/core/public';
import useMount from 'react-use/lib/useMount';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';
import { TableListView, useKibana } from '@kbn/kibana-react-plugin/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';

import { attemptLoadDashboardByTitle } from '../lib';
import { DashboardAppServices, DashboardRedirect } from '../../types';
import {
  getDashboardBreadcrumb,
  dashboardListingTable,
  noItemsStrings,
  dashboardUnsavedListingStrings,
  getNewDashboardTitle,
} from '../../dashboard_strings';
import { DashboardUnsavedListing } from './dashboard_unsaved_listing';
import { confirmCreateWithUnsaved, confirmDiscardUnsavedChanges } from './confirm_overlays';
import { getDashboardListItemLink } from './get_dashboard_list_item_link';
import { DashboardAppNoDataPage, isDashboardAppInNoDataState } from '../dashboard_app_no_data';
import { pluginServices } from '../../services/plugin_services';
import { DASHBOARD_PANELS_UNSAVED_ID } from '../../services/dashboard_session_storage/dashboard_session_storage_service';

const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';
const SAVED_OBJECTS_PER_PAGE_SETTING = 'savedObjects:perPage';

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
    services: { savedDashboards },
  } = useKibana<DashboardAppServices>();

  const {
    application,
    chrome: { setBreadcrumbs },
    coreContext: { executionContext },
    dashboardCapabilities: { showWriteControls },
    dashboardSessionStorage,
    data: { query },
    notifications: { toasts },
    savedObjects: { client },
    savedObjectsTagging: { getSearchBarFilter, parseSearchQuery },
    settings: { uiSettings, theme },
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
      attemptLoadDashboardByTitle(title).then((result) => {
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
  }, [title, client, redirectTo, query, kbnUrlStateStorage]);

  const listingLimit = uiSettings.get(SAVED_OBJECTS_LIMIT_SETTING);
  const initialPageSize = uiSettings.get(SAVED_OBJECTS_PER_PAGE_SETTING);
  const defaultFilter = title ? `"${title}"` : '';

  const tableColumns = useMemo(
    () => getTableColumns(kbnUrlStateStorage, uiSettings.get('state:storeInSessionStorage')),
    [uiSettings, kbnUrlStateStorage]
  );

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
    (filter: string) => {
      let searchTerm = filter;
      let references: SavedObjectsFindOptionsReference[] | undefined;
      if (parseSearchQuery) {
        const parsed = parseSearchQuery(filter, {
          useName: true,
        });
        searchTerm = parsed.searchTerm;
        references = parsed.tagReferences;
      }

      return savedDashboards.find(searchTerm, {
        size: listingLimit,
        hasReference: references,
      });
    },
    [listingLimit, savedDashboards, parseSearchQuery]
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
    const searchBarFilter = getSearchBarFilter?.({ useName: true });
    return searchBarFilter ? [searchBarFilter] : [];
  }, [getSearchBarFilter]);

  const { getEntityName, getTableCaption, getTableListTitle, getEntityNamePlural } =
    dashboardListingTable;
  return (
    <>
      {showNoDataPage && (
        <DashboardAppNoDataPage onDataViewCreated={() => setShowNoDataPage(false)} />
      )}
      {!showNoDataPage && (
        <TableListView
          createItem={!showWriteControls ? undefined : createItem}
          deleteItems={!showWriteControls ? undefined : deleteItems}
          initialPageSize={initialPageSize}
          editItem={!showWriteControls ? undefined : editItem}
          initialFilter={initialFilter ?? defaultFilter}
          toastNotifications={toasts}
          headingId="dashboardListingHeading"
          findItems={fetchItems}
          rowHeader="title"
          entityNamePlural={getEntityNamePlural()}
          tableListTitle={getTableListTitle()}
          tableCaption={getTableCaption()}
          entityName={getEntityName()}
          {...{
            emptyPrompt,
            searchFilters,
            listingLimit,
            tableColumns,
          }}
          theme={theme}
          // The below type conversion is necessary until the TableListView component allows partial services
          application={application as unknown as ApplicationStart}
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

const getTableColumns = (kbnUrlStateStorage: IKbnUrlStateStorage, useHash: boolean) => {
  const {
    savedObjectsTagging: { getTableColumnDefinition },
  } = pluginServices.getServices();
  const tableColumnDefinition = getTableColumnDefinition?.();

  return [
    {
      field: 'title',
      name: dashboardListingTable.getTitleColumnName(),
      sortable: true,
      render: (field: string, record: { id: string; title: string; timeRestore: boolean }) => (
        <EuiLink
          href={getDashboardListItemLink(
            kbnUrlStateStorage,
            useHash,
            record.id,
            record.timeRestore
          )}
          data-test-subj={`dashboardListingTitleLink-${record.title.split(' ').join('-')}`}
        >
          {field}
        </EuiLink>
      ),
    },
    {
      field: 'description',
      name: dashboardListingTable.getDescriptionColumnName(),
      render: (field: string, record: { description: string }) => <span>{record.description}</span>,
      sortable: true,
    },
    ...(tableColumnDefinition ? [tableColumnDefinition] : []),
  ] as unknown as Array<EuiBasicTableColumn<Record<string, unknown>>>;
};
