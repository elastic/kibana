/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';

import { AppMenu } from '@kbn/core-chrome-app-menu';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { TopNavMenuProps } from '@kbn/navigation-plugin/public';

import { coreServices } from '../services/kibana_services';
import { DashboardFavoriteButton } from './dashboard_favorite_button';

export interface LegacyDashboardHeaderProps {
  badges: NonNullable<TopNavMenuProps['badges']>;
  config?: AppMenuConfig;
  lastSavedId?: string;
}

/**
 * Dashboard header for classic chrome (or Project with Chrome Next disabled): the app menu, badges, and favorite
 * button are pushed through the imperative chrome APIs instead of a rendered `AppHeader`.
 */
export const LegacyDashboardHeader = ({
  badges,
  config,
  lastSavedId,
}: LegacyDashboardHeaderProps) => {
  useEffect(() => {
    coreServices.chrome.setBreadcrumbsBadges(badges);
    return () => {
      coreServices.chrome.setBreadcrumbsBadges([]);
    };
  }, [badges]);

  useEffect(() => {
    return coreServices.chrome.setBreadcrumbsAppendExtension({
      content: <DashboardFavoriteButton dashboardId={lastSavedId} />,
      order: 0,
    });
  }, [lastSavedId]);

  return <AppMenu setAppMenu={coreServices.chrome.setAppMenu} config={config} />;
};
