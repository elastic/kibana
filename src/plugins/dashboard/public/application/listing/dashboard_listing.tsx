/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Fragment, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { DashboardAppServices, DashboardListingProps } from '../types';
import { TableListView, useKibana } from '../../../../kibana_react/public';
import { ApplicationStart } from '../../../../../core/public';
import { DashboardSavedObject } from '../../saved_dashboards';
import { syncQueryStateWithUrl } from '../../../../data/public';
import { SavedObjectsTaggingApi } from '../../../../saved_objects_tagging_oss/public';

export const EMPTY_FILTER = '';

// saved object client does not support sorting by title because title is only mapped as analyzed
// the legacy implementation got around this by pulling `listingLimit` items and doing client side sorting
// and not supporting server-side paging.
// This component does not try to tackle these problems (yet) and is just feature matching the legacy component
// TODO support server side sorting/paging once title and description are sortable on the server.
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
      chrome,
      savedObjects,
      savedDashboards,
      savedObjectsClient,
      savedObjectsTagging,
      dashboardCapabilities,
    },
  } = useKibana<DashboardAppServices>();

  useEffect(() => {
    chrome.setBreadcrumbs([
      {
        text: i18n.translate('dashboard.dashboardBreadcrumbsTitle', {
          defaultMessage: 'Dashboards',
        }),
      },
    ]);
  }, [chrome]);

  useEffect(() => {
    // syncs `_g` portion of url with query services
    const { stop: stopSyncingQueryServiceStateWithUrl } = syncQueryStateWithUrl(
      data.query,
      kbnUrlStateStorage
    );

    if (title) {
      savedObjectsClient
        .find<DashboardSavedObject>({
          search: `"${title}"`,
          searchFields: ['title'],
          type: 'dashboard',
        })
        .then((results) => {
          // The search isn't an exact match, lets see if we can find a single exact match to use
          const matchingDashboards = results.savedObjects.filter(
            (dashboard) => dashboard.attributes.title.toLowerCase() === title.toLowerCase()
          );
          if (matchingDashboards.length === 1) {
            redirectTo({
              destination: 'dashboard',
              id: matchingDashboards[0].id,
              useReplace: true,
            });
          } else {
            redirectTo({
              destination: 'listing',
              useReplace: true,
              filter: title,
            });
          }
        });
    }

    return () => {
      stopSyncingQueryServiceStateWithUrl();
    };
  }, [title, savedObjectsClient, redirectTo, data.query, kbnUrlStateStorage]);

  const hideWriteControls = dashboardCapabilities.hideWriteControls;
  const listingLimit = savedObjects.settings.getListingLimit();

  const tableColumns = getTableColumns(
    (id) => redirectTo({ destination: 'dashboard', id }),
    savedObjectsTagging
  );
  const noItemsFragment = getNoItemsMessage(hideWriteControls, core.application, () =>
    redirectTo({ destination: 'dashboard' })
  );

  return (
    <TableListView
      headingId="dashboardListingHeading"
      rowHeader="title"
      createItem={hideWriteControls ? undefined : () => redirectTo({ destination: 'dashboard' })}
      findItems={(search) => savedDashboards.find(search, listingLimit)}
      deleteItems={
        hideWriteControls
          ? undefined
          : (dashboards: Array<{ id: string }>) =>
              savedDashboards.delete(dashboards.map((d) => d.id))
      }
      editItem={
        hideWriteControls
          ? undefined
          : ({ id }: { id: string | undefined }) => redirectTo({ destination: 'dashboard', id })
      }
      searchFilters={
        savedObjectsTagging ? [savedObjectsTagging.ui.getSearchBarFilter({ useName: true })] : []
      }
      tableColumns={tableColumns}
      listingLimit={listingLimit}
      initialPageSize={savedObjects.settings.getPerPage()}
      initialFilter={initialFilter ?? ''}
      noItemsFragment={noItemsFragment}
      entityName={i18n.translate('dashboard.listing.table.entityName', {
        defaultMessage: 'dashboard',
      })}
      entityNamePlural={i18n.translate('dashboard.listing.table.entityNamePlural', {
        defaultMessage: 'dashboards',
      })}
      tableListTitle={i18n.translate('dashboard.listing.dashboardsTitle', {
        defaultMessage: 'Dashboards',
      })}
      tableCaption={i18n.translate('dashboard.listing.dashboardsTitle', {
        defaultMessage: 'Dashboards',
      })}
      toastNotifications={core.notifications.toasts}
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
      name: i18n.translate('dashboard.listing.table.titleColumnName', {
        defaultMessage: 'Title',
      }),
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
      name: i18n.translate('dashboard.listing.table.descriptionColumnName', {
        defaultMessage: 'Description',
      }),
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
