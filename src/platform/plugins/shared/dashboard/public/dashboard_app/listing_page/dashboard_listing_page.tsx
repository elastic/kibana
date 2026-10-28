/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { i18n } from '@kbn/i18n';

import { syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';

import { DashboardListing } from '../../dashboard_listing/dashboard_listing';
import { coreServices, dataService, serverlessService } from '../../services/kibana_services';
import { getDashboardBreadcrumb } from '../_dashboard_app_strings';
import {
  DashboardAppNoDataPage,
  isDashboardAppInNoDataState,
} from '../no_data/dashboard_app_no_data';
import { getDashboardListItemLink } from './get_dashboard_list_item_link';
import type { DashboardRedirect } from '../types';
import { findService } from '../../dashboard_client';
import { useDashboardMountContext } from '../hooks/dashboard_mount_context';
import { LANDING_PAGE_PATH } from '../../../common/page_bundle_constants';

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
  const { getListingTabs } = useDashboardMountContext();
  const { activeTab: activeTabParam } = useParams<{ activeTab?: string }>();
  const [showNoDataPage, setShowNoDataPage] = useState<boolean | undefined>();
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const isInNoDataState = await isDashboardAppInNoDataState();
        setShowNoDataPage(isInNoDataState && isMounted);
      } catch (error) {
        // show the listing if the no data state can not be determined
        if (isMounted) setShowNoDataPage(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeTabTitle = useMemo(() => {
    if (!activeTabParam || activeTabParam === 'dashboards') return undefined;
    return getListingTabs().find((tab) => tab.id === activeTabParam)?.title;
  }, [activeTabParam, getListingTabs]);

  useEffect(() => {
    const dashboardCrumb = { text: getDashboardBreadcrumb() };

    if (activeTabTitle) {
      const tabCrumb = { text: activeTabTitle };
      coreServices.chrome.setBreadcrumbs(
        [
          {
            ...dashboardCrumb,
            'data-test-subj': `dashboardListingBreadcrumb-${activeTabParam}`,
            onClick: () =>
              coreServices.application.navigateToUrl(
                coreServices.application.getUrlForApp('dashboards', {
                  path: `#${LANDING_PAGE_PATH}`,
                })
              ),
          },
          tabCrumb,
        ],
        { project: { value: [tabCrumb] } }
      );
    } else {
      coreServices.chrome.setBreadcrumbs([dashboardCrumb], { project: { value: [] } });
    }

    if (serverlessService) {
      // if serverless breadcrumbs available,
      // reset any deeper context breadcrumbs to only keep the main "dashboard" part that comes from the navigation config
      serverlessService.setBreadcrumbs(activeTabTitle ? [{ text: activeTabTitle }] : []);
    }
  }, [activeTabTitle, activeTabParam]);

  useEffect(() => {
    // syncs `_g` portion of url with query services
    const { stop: stopSyncingQueryServiceStateWithUrl } = syncGlobalQueryStateWithUrl(
      dataService.query,
      kbnUrlStateStorage
    );
    let canceled = false;
    if (title) {
      findService
        .findByTitle(title)
        .then((result) => {
          if (canceled || !result) return;
          redirectTo({
            destination: 'dashboard',
            id: result.id,
            useReplace: true,
          });
        })
        .catch((error) => {
          if (canceled) return;
          coreServices.notifications.toasts.addError(error, {
            title: i18n.translate('dashboard.listing.findByTitleError', {
              defaultMessage: 'Unable to find dashboard "{title}"',
              values: { title },
            }),
          });
        });
    }

    return () => {
      canceled = true;
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
            redirectTo({ destination: 'dashboard', id, editMode: viewMode === 'edit' });
          }}
          getDashboardUrl={(id, timeRestore) => {
            return getDashboardListItemLink(kbnUrlStateStorage, id, timeRestore);
          }}
          getTabs={getListingTabs}
        />
      )}
    </>
  );
};
