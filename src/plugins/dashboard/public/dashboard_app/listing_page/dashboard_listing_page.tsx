/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';

import {
  DashboardAppNoDataPage,
  isDashboardAppInNoDataState,
} from '../no_data/dashboard_app_no_data';
import { pluginServices } from '../../services/plugin_services';
import { getDashboardBreadcrumb } from '../_dashboard_app_strings';
import { DashboardRedirect } from '../../dashboard_container/types';
import { getDashboardListItemLink } from './get_dashboard_list_item_link';
import { DashboardListing } from '../../dashboard_listing/dashboard_listing';

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
  const {
    data: { query },
    serverless,
    chrome: { setBreadcrumbs },
    dashboardContentManagement: { findDashboards },
  } = pluginServices.getServices();

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
    setBreadcrumbs([
      {
        text: getDashboardBreadcrumb(),
      },
    ]);

    if (serverless?.setBreadcrumbs) {
      // if serverless breadcrumbs available,
      // reset any deeper context breadcrumbs to only keep the main "dashboard" part that comes from the navigation config
      serverless.setBreadcrumbs([]);
    }
  }, [setBreadcrumbs, serverless]);

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
