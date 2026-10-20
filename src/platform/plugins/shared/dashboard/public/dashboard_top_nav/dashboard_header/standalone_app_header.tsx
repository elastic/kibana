/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';

import { AppHeader } from '@kbn/app-header';
import type {
  AppHeaderBack,
  AppHeaderBadge,
  AppHeaderExperimentalDashboardAiAction,
  AppHeaderShareAction,
} from '@kbn/app-header';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { useFavorite } from '@kbn/content-management-favorites-public';
import { DASHBOARD_APP_ID, LANDING_PAGE_PATH } from '../../../common/page_bundle_constants';
import { getDashboardBreadcrumb } from '../../dashboard_app/_dashboard_app_strings';
import { coreServices } from '../../services/kibana_services';

interface Props {
  title: string;
  menu?: AppMenuConfig;
  badges: AppHeaderBadge[];
  dashboardId?: string;
  share?: AppHeaderShareAction;
  experimentalDashboardAiAction?: AppHeaderExperimentalDashboardAiAction;
}

/**
 * Standalone dashboard under next chrome: render `AppHeader` inline.
 * Must render inside `DashboardFavoritesProvider`.
 */
export const StandaloneAppHeader = ({ dashboardId, ...props }: Props) => {
  const favorite = useFavorite({ id: dashboardId });

  // Project chrome hides the classic breadcrumbs, so the header carries its own back button that leads to the dashboard listing page.
  const backToListing = useMemo<AppHeaderBack>(
    () => ({
      href: coreServices.application.getUrlForApp(DASHBOARD_APP_ID, {
        path: `#${LANDING_PAGE_PATH}`,
      }),
      label: getDashboardBreadcrumb(),
    }),
    []
  );

  return <AppHeader {...props} back={backToListing} favorite={favorite} spacing="compact" />;
};
