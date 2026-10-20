/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';

import { AppHeader, ChromeAppHeaderRegistration } from '@kbn/app-header';
import type {
  AppHeaderBack,
  AppHeaderBadge,
  AppHeaderExperimentalDashboardAiAction,
  AppHeaderShareAction,
} from '@kbn/app-header';
import { useFavorite } from '@kbn/content-management-favorites-public';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { TopNavMenuProps } from '@kbn/navigation-plugin/public';
import { DASHBOARD_APP_ID, LANDING_PAGE_PATH } from '../../../common/page_bundle_constants';
import { getDashboardBreadcrumb } from '../../dashboard_app/_dashboard_app_strings';
import { coreServices } from '../../services/kibana_services';

interface Props {
  /** A host app provided `setCustomHeaderActionMenu`. */
  isHostedByApp: boolean;
  title: string;
  menu?: AppMenuConfig;
  badges: NonNullable<TopNavMenuProps['badges']>;
  dashboardId?: string;
  share?: AppHeaderShareAction;
  experimentalDashboardAiAction?: AppHeaderExperimentalDashboardAiAction;
}

/**
 * Dashboard header for next chrome. Must render inside `DashboardFavoritesProvider`.
 */
export const NextChromeAppHeader = ({ isHostedByApp, dashboardId, badges, ...props }: Props) => {
  const favorite = useFavorite({ id: dashboardId });

  const appHeaderBadges = useMemo<AppHeaderBadge[]>(
    () =>
      badges.map((badge) => ({
        label: badge.badgeText,
        renderCustomBadge: badge.renderCustomBadge,
      })),
    [badges]
  );

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

  // Hosted by an app that owns the layout and provides its own header slot (e.g. Security):
  // register the content so chrome renders it in the app-header slot.
  if (isHostedByApp) {
    return (
      <ChromeAppHeaderRegistration
        {...props}
        badges={appHeaderBadges}
        favorite={favorite}
        spacing="compact"
      />
    );
  }

  return (
    <AppHeader
      {...props}
      badges={appHeaderBadges}
      back={backToListing}
      favorite={favorite}
      spacing="compact"
    />
  );
};
