/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';

import { syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';

import { DashboardRedirect } from '../../dashboard_container/types';
import { DashboardListing } from '../../dashboard_listing/dashboard_listing';
import { coreServices, dataService, serverlessService } from '../../services/kibana_services';
import { getDashboardBreadcrumb } from '../_dashboard_app_strings';
import {
  DashboardAppNoDataPage,
  isDashboardAppInNoDataState,
} from '../no_data/dashboard_app_no_data';
import { getDashboardListItemLink } from './get_dashboard_list_item_link';
import { getDashboardContentManagementService } from '../../services/dashboard_content_management_service';

export interface DashboardListingPageProps {
  kbnUrlStateStorage: IKbnUrlStateStorage;
  redirectTo: DashboardRedirect;
  initialFilter?: string;
  title?: string;
}

export const DashboardListingPage = ({
  title,
  redirectTo,
  initialFilter,
  kbnUrlStateStorage,
}: DashboardListingPageProps) => {
  const [showNoDataPage, setShowNoDataPage] = useState<boolean | undefined>();
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const isInNoDataState = await isDashboardAppInNoDataState();
      setShowNoDataPage(isInNoDataState && isMounted);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    coreServices.chrome.setBreadcrumbs(
      [
        {
          text: getDashboardBreadcrumb(),
        },
      ],
      {
        project: { value: [] },
      }
    );

    if (serverlessService) {
      // if serverless breadcrumbs available,
      // reset any deeper context breadcrumbs to only keep the main "dashboard" part that comes from the navigation config
      serverlessService.setBreadcrumbs([]);
    }
  }, []);

  useEffect(() => {
    // syncs `_g` portion of url with query services
    const { stop: stopSyncingQueryServiceStateWithUrl } = syncGlobalQueryStateWithUrl(
      dataService.query,
      kbnUrlStateStorage
    );
    if (title) {
      getDashboardContentManagementService()
        .findDashboards.findByTitle(title)
        .then((result) => {
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
  }, [title, redirectTo, kbnUrlStateStorage]);

  const titleFilter = title ? `${title}` : '';

  if (showNoDataPage === undefined) {
    return null;
  }

  return (
    <>
      {showNoDataPage && (
        <DashboardAppNoDataPage onDataViewCreated={() => setShowNoDataPage(false)} />
      )}
      {!showNoDataPage && (
        <DashboardListing
          useSessionStorageIntegration={true}
          initialFilter={initialFilter ?? titleFilter}
          goToDashboard={(id, viewMode) => {
            redirectTo({ destination: 'dashboard', id, editMode: viewMode === ViewMode.EDIT });
          }}
          getDashboardUrl={(id, timeRestore) => {
            return getDashboardListItemLink(kbnUrlStateStorage, id, timeRestore);
          }}
        />
      )}
    </>
  );
};
