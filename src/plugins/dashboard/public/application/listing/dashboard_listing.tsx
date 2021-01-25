/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink, EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import React, { Fragment, useCallback, useEffect, useMemo } from 'react';

import { attemptLoadDashboardByTitle } from '../lib';
import { DashboardAppServices, DashboardRedirect } from '../types';
import { getDashboardBreadcrumb, dashboardListingTable } from '../../dashboard_strings';
import { ApplicationStart, SavedObjectsFindOptionsReference } from '../../../../../core/public';

import { syncQueryStateWithUrl } from '../../services/data';
import { IKbnUrlStateStorage } from '../../services/kibana_utils';
import { TableListView, useKibana } from '../../services/kibana_react';
import { SavedObjectsTaggingApi } from '../../services/saved_objects_tagging_oss';

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
      chrome: { setBreadcrumbs },
    },
  } = useKibana<DashboardAppServices>();

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

  const hideWriteControls = dashboardCapabilities.hideWriteControls;
  const listingLimit = savedObjects.settings.getListingLimit();
  const defaultFilter = title ? `"${title}"` : '';

  const tableColumns = useMemo(
    () =>
      getTableColumns((id) => redirectTo({ destination: 'dashboard', id }), savedObjectsTagging),
    [savedObjectsTagging, redirectTo]
  );

  const noItemsFragment = useMemo(
    () =>
      getNoItemsMessage(hideWriteControls, core.application, () =>
        redirectTo({ destination: 'dashboard' })
      ),
    [redirectTo, core.application, hideWriteControls]
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
    (dashboards: Array<{ id: string }>) => savedDashboards.delete(dashboards.map((d) => d.id)),
    [savedDashboards]
  );

  const editItem = useCallback(
    ({ id }: { id: string | undefined }) => redirectTo({ destination: 'dashboard', id }),
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
      createItem={hideWriteControls ? undefined : () => redirectTo({ destination: 'dashboard' })}
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
        noItemsFragment,
        searchFilters,
        listingLimit,
        tableColumns,
      }}
    />
  );
};

const getTableColumns = (
  redirectTo: (id?: string) => void,
  savedObjectsTagging?: SavedObjectsTaggingApi
) => {
  return [
    {
      field: 'title',
      name: dashboardListingTable.getTitleColumnName(),
      sortable: true,
      render: (field: string, record: { id: string; title: string }) => (
        <EuiLink
          onClick={() => redirectTo(record.id)}
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
      <div>
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
      </div>
    );
  }

  return (
    <div>
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
    </div>
  );
};
