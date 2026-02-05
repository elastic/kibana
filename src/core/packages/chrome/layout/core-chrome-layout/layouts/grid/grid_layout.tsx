/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React from 'react';
import { combineLatest, map } from 'rxjs';
import type { ChromeLayoutConfig } from '@kbn/core-chrome-layout-components';
import {
  ChromeLayout,
  ChromeLayoutConfigProvider,
  SimpleDebugOverlay,
} from '@kbn/core-chrome-layout-components';
import useObservable from 'react-use/lib/useObservable';
import { GridLayoutGlobalStyles } from './grid_global_app_style';
import type {
  LayoutService,
  LayoutServiceParams,
  LayoutServiceStartDeps,
} from '../../layout_service';
import { AppWrapper } from '../../app_containers';
import { APP_FIXED_VIEWPORT_ID } from '../../app_fixed_viewport';

const layoutConfigs: { classic: ChromeLayoutConfig; project: ChromeLayoutConfig } = {
  classic: {
    chromeStyle: 'classic',
    headerHeight: 96,
    bannerHeight: 32,
    sidebarWidth: 0,
    footerHeight: 0,
    navigationWidth: 0,
  },
  project: {
    chromeStyle: 'project',
    headerHeight: 48,
    bannerHeight: 32,

    /** The application top bar renders the app specific menu */
    /** we use it only in project style, because in classic it is included as part of the global header */
    applicationTopBarHeight: 48,
    applicationMarginRight: 8,
    applicationMarginBottom: 8,
    sidebarWidth: 0,
    footerHeight: 0,
    navigationWidth: 0,
  },
};

/**
 * Service for providing layout component wired to other core services.
 */
export class GridLayout implements LayoutService {
  constructor(
    private readonly deps: LayoutServiceStartDeps,
    private readonly params: LayoutServiceParams
  ) {}

  /**
   * Returns a layout component with the provided dependencies
   */
  public getComponent(): React.ComponentType {
    const { application, chrome, overlays } = this.deps;

    const appComponent = application.getComponent();
    const appBannerComponent = overlays.banners.getComponent();
    const hasHeaderBanner$ = chrome.hasHeaderBanner$();
    const chromeVisible$ = chrome.getIsVisible$();
    const chromeStyle$ = chrome.getChromeStyle$();
    const debug = this.params.debug ?? false;

    const classicChromeHeader = chrome.getClassicHeaderComponent();
    const projectChromeHeader = chrome.getProjectHeaderComponent();
    const headerBanner = chrome.getHeaderBanner();

    // chromeless header is used when chrome is not visible and responsible for displaying the data-test-subj and fixed loading bar
    const chromelessHeader = chrome.getChromelessHeader();

    // in project style, the project app menu is displayed at the top of application area
    const projectAppMenu = chrome.getProjectAppMenuComponent();
    const hasAppMenu$ = combineLatest([application.currentActionMenu$, chrome.getAppMenu$()]).pipe(
      map(([menu, appMenu]) => !!menu || !!appMenu)
    );

    const projectSideNavigation = chrome.getProjectSideNavComponent();

    const sidebar = chrome.getSidebarComponent();

    const footer$ = chrome.getGlobalFooter$();

    const sidebarWidth$ = combineLatest([
      chrome.sidebar.getWidth$(),
      chrome.sidebar.isOpen$(),
    ]).pipe(map(([width, isOpen]) => (isOpen ? width : 0)));

    return React.memo(() => {
      // TODO: Get rid of observables https://github.com/elastic/kibana/issues/225265
      const chromeVisible = useObservable(chromeVisible$, false);
      const hasHeaderBanner = useObservable(hasHeaderBanner$, false);
      const chromeStyle = useObservable(chromeStyle$, 'classic');
      const hasAppMenu = useObservable(hasAppMenu$, false);
      const footer: ReactNode = useObservable(footer$, null);
      const sidebarWidth = useObservable(sidebarWidth$, 0);

      const layoutConfig = {
        ...layoutConfigs[chromeStyle],
        sidebarWidth,
      };

      // Assign main layout parts first
      let header: ReactNode;
      let navigation: ReactNode;
      let banner: ReactNode;
      let applicationTopBar: ReactNode;

      if (chromeVisible) {
        if (chromeStyle === 'classic') {
          // If classic style, we use the classic header and no navigation, since it is part of the header
          header = classicChromeHeader;
        } else {
          // If project style, we use the project header and navigation
          header = projectChromeHeader;
          if (hasAppMenu) {
            // If project app menu is present, we use it as the application top bar
            applicationTopBar = projectAppMenu;
          }

          navigation = projectSideNavigation;
        }
      }

      if (hasHeaderBanner) {
        // If header banner is present, we use it, even if chrome is not visible
        banner = headerBanner;
      }

      // If debug, override/add debug overlays
      if (debug) {
        if (chromeVisible) {
          if (!navigation) {
            navigation = <SimpleDebugOverlay label="Debug Navigation" />;
          }
        }
        // banner is visible even when chrome is not visible
        if (!banner) {
          banner = <SimpleDebugOverlay label="Debug Banner" />;
        }
      }

      return (
        <>
          <GridLayoutGlobalStyles chromeStyle={chromeStyle} />
          <ChromeLayoutConfigProvider value={layoutConfig}>
            <ChromeLayout
              header={header}
              sidebar={sidebar}
              footer={footer}
              navigation={navigation}
              banner={banner}
              applicationTopBar={applicationTopBar}
            >
              <>
                {/* If chrome is not visible, we use the chromeless header to display the*/}
                {/* data-test-subj and fixed loading bar*/}
                {!chromeVisible && chromelessHeader}

                <div id="globalBannerList">{appBannerComponent}</div>
                <AppWrapper chromeVisible={chromeVisible}>
                  {/* Affixes a div to restrict the position of charts tooltip to the visible viewport minus the header */}
                  <div id={APP_FIXED_VIEWPORT_ID} />

                  {/* The actual plugin/app */}
                  {appComponent}
                </AppWrapper>
              </>
            </ChromeLayout>
          </ChromeLayoutConfigProvider>
        </>
      );
    });
  }
}
