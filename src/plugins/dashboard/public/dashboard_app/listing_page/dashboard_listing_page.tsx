/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
    chrome: { setBreadcrumbs },
    dashboardContentManagement: { findDashboards },
  } = pluginServices.getServices();

  const [showNoDataPage, setShowNoDataPage] = useState<boolean>(false);
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const isInNoDataState = await isDashboardAppInNoDataState();
      if (isInNoDataState && isMounted) setShowNoDataPage(true);
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

  const titleFilter = title ? `${title}` : '';

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
