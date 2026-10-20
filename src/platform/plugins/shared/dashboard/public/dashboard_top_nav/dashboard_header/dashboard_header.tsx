/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import type { AppHeaderExperimentalDashboardAiAction, AppHeaderShareAction } from '@kbn/app-header';
import { AppMenuComponent } from '@kbn/core-chrome-app-menu-components';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { useChromeStyle } from '@kbn/core-chrome-browser-hooks';
import type { TopNavMenuProps } from '@kbn/navigation-plugin/public';
import { DashboardFavoritesProvider } from '../dashboard_favorite_button';
import { LegacyDashboardHeader } from './legacy_dashboard_header';
import { NextChromeAppHeader } from './next_chrome_app_header';

interface Props {
  title: string;
  /** App menu config. `undefined` when the top menu is hidden. */
  menu?: AppMenuConfig;
  badges: NonNullable<TopNavMenuProps['badges']>;
  dashboardId?: string;
  share?: AppHeaderShareAction;
  experimentalDashboardAiAction?: AppHeaderExperimentalDashboardAiAction;
  /** The page was loaded with the `embed=true` URL param. */
  isEmbeddedViaUrl: boolean;
  /** A host app provided `setCustomHeaderActionMenu`. */
  isHostedByApp: boolean;
}

/**
 * Renders the dashboard's title, menu, and actions with the header that matches how the dashboard is shown.
 */
export const DashboardHeader = ({
  title,
  menu,
  badges,
  dashboardId,
  share,
  experimentalDashboardAiAction,
  isEmbeddedViaUrl,
  isHostedByApp,
}: Props) => {
  const chromeStyle = useChromeStyle();

  // URL embed (`embed=true`), any chrome style. Chrome is hidden, so pushing the menu through
  // `chrome.setAppMenu` would render nothing. Render the app menu inline instead, and only when
  // `show-top-menu=true` forces it visible.
  if (isEmbeddedViaUrl) {
    return menu ? <AppMenuComponent config={menu} /> : null;
  }

  // Classic chrome: push through the imperative chrome APIs.
  if (chromeStyle !== 'project') {
    return (
      <LegacyDashboardHeader
        badges={badges}
        config={menu}
        lastSavedId={dashboardId}
        enhanceAction={experimentalDashboardAiAction}
      />
    );
  }

  // Next chrome
  return (
    <DashboardFavoritesProvider>
      <NextChromeAppHeader
        isHostedByApp={isHostedByApp}
        title={title}
        menu={menu}
        badges={badges}
        dashboardId={dashboardId}
        share={share}
        experimentalDashboardAiAction={experimentalDashboardAiAction}
      />
    </DashboardFavoritesProvider>
  );
};
