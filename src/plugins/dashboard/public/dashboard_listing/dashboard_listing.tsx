/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FormattedRelative, I18nProvider } from '@kbn/i18n-react';
import React, { PropsWithChildren, useCallback, useMemo, useState } from 'react';

import {
  type TableListViewKibanaDependencies,
  TableListViewKibanaProvider,
  type UserContentCommonSchema,
} from '@kbn/content-management-table-list-view-table';
import { TableListView } from '@kbn/content-management-table-list-view';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type { SavedObjectsFindOptionsReference } from '@kbn/core/public';
import { toMountPoint, useExecutionContext } from '@kbn/kibana-react-plugin/public';

import {
  DASHBOARD_CONTENT_ID,
  SAVED_OBJECT_DELETE_TIME,
  SAVED_OBJECT_LOADED_TIME,
} from '../dashboard_constants';
import {
  dashboardListingTableStrings,
  dashboardListingErrorStrings,
} from './_dashboard_listing_strings';
import { pluginServices } from '../services/plugin_services';
import { confirmCreateWithUnsaved } from './confirm_overlays';
import { DashboardItem } from '../../common/content_management';
import { DashboardUnsavedListing } from './dashboard_unsaved_listing';
import { DashboardApplicationService } from '../services/application/types';
import { DashboardListingEmptyPrompt } from './dashboard_listing_empty_prompt';

// because the type of `application.capabilities.advancedSettings` is so generic, the provider
// requiring the `save` key to be part of it is causing type issues - so, creating a custom type
type TableListViewApplicationService = DashboardApplicationService & {
  capabilities: { advancedSettings: { save: boolean } };
};

const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';
const SAVED_OBJECTS_PER_PAGE_SETTING = 'savedObjects:perPage';

interface DashboardSavedObjectUserContent extends UserContentCommonSchema {
  attributes: {
    title: string;
    description?: string;
    timeRestore: boolean;
  };
}

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

export type DashboardListingProps = PropsWithChildren<{
  initialFilter?: string;
  useSessionStorageIntegration?: boolean;
  goToDashboard: (dashboardId?: string, viewMode?: ViewMode) => void;
  getDashboardUrl: (dashboardId: string, usesTimeRestore: boolean) => string;
}>;

export const DashboardListing = ({
  children,
  initialFilter,
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
}: DashboardListingProps) => {
  const {
    application,
    notifications,
    overlays,
    http,
    savedObjectsTagging,
    dashboardSessionStorage,
    settings: { uiSettings },
    notifications: { toasts },
    coreContext: { executionContext },
    dashboardCapabilities: { showWriteControls },
    dashboardContentManagement: { findDashboards, deleteDashboards },
  } = pluginServices.getServices();

  const [unsavedDashboardIds, setUnsavedDashboardIds] = useState<string[]>(
    dashboardSessionStorage.getDashboardIdsWithUnsavedChanges()
  );

  useExecutionContext(executionContext, {
    type: 'application',
    page: 'list',
  });

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
  const emptyPrompt = (
    <DashboardListingEmptyPrompt
      createItem={createItem}
      goToDashboard={goToDashboard}
      unsavedDashboardIds={unsavedDashboardIds}
      setUnsavedDashboardIds={setUnsavedDashboardIds}
      useSessionStorageIntegration={useSessionStorageIntegration}
    />
  );

  const { getEntityName, getTableListTitle, getEntityNamePlural } = dashboardListingTableStrings;

  const savedObjectsTaggingFakePlugin = useMemo(() => {
    return savedObjectsTagging.hasApi // TODO: clean up this logic once https://github.com/elastic/kibana/issues/140433 is resolved
      ? ({
          ui: savedObjectsTagging,
        } as TableListViewKibanaDependencies['savedObjectsTagging'])
      : undefined;
  }, [savedObjectsTagging]);

  return (
    <I18nProvider>
      <TableListViewKibanaProvider
        {...{
          core: {
            application: application as TableListViewApplicationService,
            notifications,
            overlays,
            http,
          },
          toMountPoint,
          savedObjectsTagging: savedObjectsTaggingFakePlugin,
          FormattedRelative,
        }}
      >
        <TableListView<DashboardSavedObjectUserContent>
          getDetailViewLink={({ id, attributes: { timeRestore } }) =>
            getDashboardUrl(id, timeRestore)
          }
          deleteItems={!showWriteControls ? undefined : deleteItems}
          createItem={!showWriteControls ? undefined : createItem}
          editItem={!showWriteControls ? undefined : editItem}
          entityNamePlural={getEntityNamePlural()}
          title={getTableListTitle()}
          headingId="dashboardListingHeading"
          initialPageSize={initialPageSize}
          initialFilter={initialFilter}
          entityName={getEntityName()}
          listingLimit={listingLimit}
          emptyPrompt={emptyPrompt}
          findItems={fetchItems}
          id="dashboard"
        >
          <>
            {children}
            <DashboardUnsavedListing
              goToDashboard={goToDashboard}
              unsavedDashboardIds={unsavedDashboardIds}
              refreshUnsavedDashboards={() =>
                setUnsavedDashboardIds(dashboardSessionStorage.getDashboardIdsWithUnsavedChanges())
              }
            />
          </>
        </TableListView>
      </TableListViewKibanaProvider>
    </I18nProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default DashboardListing;
