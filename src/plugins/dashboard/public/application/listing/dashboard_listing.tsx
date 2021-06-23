/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink, EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { attemptLoadDashboardByTitle } from '../lib';
import { DashboardAppServices, DashboardRedirect } from '../../types';
import { getDashboardBreadcrumb, dashboardListingTable } from '../../dashboard_strings';
import { ApplicationStart, SavedObjectsFindOptionsReference } from '../../../../../core/public';
import { syncQueryStateWithUrl } from '../../services/data';
import { IKbnUrlStateStorage } from '../../services/kibana_utils';
import { TableListView, useKibana } from '../../services/kibana_react';
import { SavedObjectsTaggingApi } from '../../services/saved_objects_tagging_oss';
import { DashboardUnsavedListing } from './dashboard_unsaved_listing';
import { confirmCreateWithUnsaved } from './confirm_overlays';
import { getDashboardListItemLink } from './get_dashboard_list_item_link';

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
    services: {
      core,
      data,
      savedObjects,
      savedDashboards,
      savedObjectsClient,
      savedObjectsTagging,
      dashboardCapabilities,
      dashboardSessionStorage,
      chrome: { setBreadcrumbs },
    },
  } = useKibana<DashboardAppServices>();

  const [unsavedDashboardIds, setUnsavedDashboardIds] = useState<string[]>(
    dashboardSessionStorage.getDashboardIdsWithUnsavedChanges()
  );

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

  // clear dangling session because they are not required here
  useEffect(() => {
    data.search.session.clear();
  }, [data.search.session]);

  const hideWriteControls = dashboardCapabilities.hideWriteControls;
  const listingLimit = savedObjects.settings.getListingLimit();
  const defaultFilter = title ? `"${title}"` : '';

  const tableColumns = useMemo(
    () =>
      getTableColumns(
        core.application,
        kbnUrlStateStorage,
        core.uiSettings.get('state:storeInSessionStorage'),
        savedObjectsTagging
      ),
    [core.application, core.uiSettings, kbnUrlStateStorage, savedObjectsTagging]
  );

  const createItem = useCallback(() => {
    if (!dashboardSessionStorage.dashboardHasUnsavedEdits()) {
      redirectTo({ destination: 'dashboard' });
    } else {
      confirmCreateWithUnsaved(
        core.overlays,
        () => {
          dashboardSessionStorage.clearState();
          redirectTo({ destination: 'dashboard' });
        },
        () => redirectTo({ destination: 'dashboard' })
      );
    }
  }, [dashboardSessionStorage, redirectTo, core.overlays]);

  const emptyPrompt = useMemo(
    () => getNoItemsMessage(hideWriteControls, core.application, createItem),
    [createItem, core.application, hideWriteControls]
  );

  const fetchItems = useCallback(
    (filter: string) => {
      let searchTerm = filter;
      let references: SavedObjectsFindOptionsReference[] | undefined;
      if (savedObjectsTagging) {
        const parsed = savedObjectsTagging.ui.parseSearchQuery(filter, {
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
    [listingLimit, savedDashboards, savedObjectsTagging]
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
    return savedObjectsTagging
      ? [savedObjectsTagging.ui.getSearchBarFilter({ useName: true })]
      : [];
  }, [savedObjectsTagging]);

  const {
    getEntityName,
    getTableCaption,
    getTableListTitle,
    getEntityNamePlural,
  } = dashboardListingTable;
  return (
    <TableListView
      createItem={hideWriteControls ? undefined : createItem}
      deleteItems={hideWriteControls ? undefined : deleteItems}
      initialPageSize={savedObjects.settings.getPerPage()}
      editItem={hideWriteControls ? undefined : editItem}
      initialFilter={initialFilter ?? defaultFilter}
      toastNotifications={core.notifications.toasts}
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
    >
      <DashboardUnsavedListing
        redirectTo={redirectTo}
        unsavedDashboardIds={unsavedDashboardIds}
        refreshUnsavedDashboards={() =>
          setUnsavedDashboardIds(dashboardSessionStorage.getDashboardIdsWithUnsavedChanges())
        }
      />
    </TableListView>
  );
};

const getTableColumns = (
  application: ApplicationStart,
  kbnUrlStateStorage: IKbnUrlStateStorage,
  useHash: boolean,
  savedObjectsTagging?: SavedObjectsTaggingApi
) => {
  return [
    {
      field: 'title',
      name: dashboardListingTable.getTitleColumnName(),
      sortable: true,
      render: (field: string, record: { id: string; title: string; timeRestore: boolean }) => (
        <EuiLink
          href={getDashboardListItemLink(
            application,
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
    ...(savedObjectsTagging ? [savedObjectsTagging.ui.getTableColumnDefinition()] : []),
  ];
};

const getNoItemsMessage = (
  hideWriteControls: boolean,
  application: ApplicationStart,
  createItem: () => void
) => {
  if (hideWriteControls) {
    return (
      <EuiEmptyPrompt
        iconType="dashboardApp"
        title={
          <h1 id="dashboardListingHeading">
            <FormattedMessage
              id="dashboard.listing.noItemsMessage"
              defaultMessage="Looks like you don't have any dashboards."
            />
          </h1>
        }
      />
    );
  }

  return (
    <EuiEmptyPrompt
      iconType="dashboardApp"
      title={
        <h1 id="dashboardListingHeading">
          <FormattedMessage
            id="dashboard.listing.createNewDashboard.title"
            defaultMessage="Create your first dashboard"
          />
        </h1>
      }
      body={
        <Fragment>
          <p>
            <FormattedMessage
              id="dashboard.listing.createNewDashboard.combineDataViewFromKibanaAppDescription"
              defaultMessage="You can combine data views from any Kibana app into one dashboard and see everything in one place."
            />
          </p>
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
                    <FormattedMessage
                      id="dashboard.listing.createNewDashboard.sampleDataInstallLinkText"
                      defaultMessage="Install some sample data"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </Fragment>
      }
      actions={
        <EuiButton
          onClick={createItem}
          fill
          iconType="plusInCircle"
          data-test-subj="createDashboardPromptButton"
        >
          <FormattedMessage
            id="dashboard.listing.createNewDashboard.createButtonLabel"
            defaultMessage="Create new dashboard"
          />
        </EuiButton>
      }
    />
  );
};
