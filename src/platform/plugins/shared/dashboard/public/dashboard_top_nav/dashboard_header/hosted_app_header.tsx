/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { ChromeAppHeaderRegistration } from '@kbn/app-header';
import type {
  AppHeaderBadge,
  AppHeaderExperimentalDashboardAiAction,
  AppHeaderShareAction,
} from '@kbn/app-header';
import { useFavorite } from '@kbn/content-management-favorites-public';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';

interface Props {
  title: string;
  menu?: AppMenuConfig;
  badges: AppHeaderBadge[];
  dashboardId?: string;
  share?: AppHeaderShareAction;
  experimentalDashboardAiAction?: AppHeaderExperimentalDashboardAiAction;
}

/**
 * Hosted by an app that owns the layout and provides its own header slot (e.g. Security): register
 * the content so chrome renders it in the app-header slot. Must render inside `DashboardFavoritesProvider`.
 */
export const HostedAppHeader = ({ dashboardId, ...props }: Props) => {
  const favorite = useFavorite({ id: dashboardId });

  return <ChromeAppHeaderRegistration {...props} favorite={favorite} spacing="compact" />;
};
