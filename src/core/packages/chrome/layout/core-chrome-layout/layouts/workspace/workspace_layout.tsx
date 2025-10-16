/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useSyncExternalStore } from 'react';
import { WorkspaceChrome } from '@kbn/core-workspace-chrome-components';

import {
  useHasAppMenu,
  useHasHeaderBanner,
  useHomeHref,
  useIsChromeVisible,
  useLogo,
} from '@kbn/core-workspace-chrome-state';
import { WorkspaceSidebarButtons } from '@kbn/core-workspace-chrome-components/sidebar';
import { GridLayoutGlobalStyles } from '../grid/grid_global_app_style';
import type { LayoutService, LayoutServiceStartDeps } from '../../layout_service';
import { AppWrapper } from '../../app_containers';
import { APP_FIXED_VIEWPORT_ID } from '../../app_fixed_viewport';

/**
 * Service for providing layout component wired to other core services.
 */
export class WorkspaceLayout implements LayoutService {
  constructor(private readonly deps: LayoutServiceStartDeps) {}

  /**
   * Returns a layout component with the provided dependencies
   */
  public getComponent(): React.ComponentType {
    const { application, chrome, overlays } = this.deps;

    const appComponent = application.getComponent();
    const appBannerComponent = overlays.banners.getComponent();

    // const headerBanner = chrome.getHeaderBanner();

    // chromeless header is used when chrome is not visible and responsible for displaying the data-test-subj and fixed loading bar
    const chromelessHeader = chrome.getChromelessHeader();

    // in project style, the project app menu is displayed at the top of application area
    const projectAppMenu = chrome.getProjectAppMenuComponent();

    return React.memo(() => {
      const isChromeVisible = useIsChromeVisible();
      const hasAppMenu = useHasAppMenu();
      const hasHeaderBanner = useHasHeaderBanner();
      const logo = useLogo();
      const homeHref = useHomeHref();

      const {
        header: { breadcrumbs, navControls },
        sidebar: { apps },
        navigation: { items },
      } = useSyncExternalStore(
        (listener) => chrome.workspace.subscribe(listener),
        () => chrome.workspace.getState()
      );

      const navigateToUrl = application.navigateToUrl;

      // Assign main layout parts first
      // let banner: React.ReactNode;
      let applicationTopBar: React.ReactNode | null = null;

      if (isChromeVisible) {
        // If project style, we use the project header and navigation;
        if (hasAppMenu) {
          // If project app menu is present, we use it as the application top bar
          applicationTopBar = projectAppMenu;
        }
      }

      if (hasHeaderBanner) {
        // If header banner is present, we use it, even if chrome is not visible
        // banner = headerBanner;
      }

      return (
        <>
          <GridLayoutGlobalStyles />
          <WorkspaceChrome>
            <WorkspaceChrome.Header {...{ breadcrumbs, navigateToUrl, navControls }}>
              <WorkspaceSidebarButtons apps={apps} />
            </WorkspaceChrome.Header>
            <WorkspaceChrome.Navigation
              {...{
                items,
                logo: { ...logo, href: homeHref },
                sidebarApps: apps,
                navigateToUrl,
              }}
            />
            <WorkspaceChrome.SidebarPanel apps={apps} />
            {applicationTopBar && (
              <WorkspaceChrome.AppTopBar>{applicationTopBar}</WorkspaceChrome.AppTopBar>
            )}
            {!isChromeVisible && chromelessHeader}
            <div id="globalBannerList">{appBannerComponent}</div>
            <AppWrapper chromeVisible={isChromeVisible}>
              <div id={APP_FIXED_VIEWPORT_ID} />
              {appComponent}
            </AppWrapper>
          </WorkspaceChrome>
        </>
      );
    });
  }
}
