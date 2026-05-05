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
import type { ChromeLayoutConfig } from '@kbn/core-chrome-layout-components';
import { ChromeLayout, ChromeLayoutConfigProvider } from '@kbn/core-chrome-layout-components';
import {
  ChromeComponentsProvider,
  ClassicHeader,
  ProjectHeader,
  GridLayoutProjectSideNav,
  HeaderTopBanner,
  ChromelessHeader,
  AppMenuBar,
  Sidebar,
  useHasAppMenu,
} from '@kbn/core-chrome-browser-components';
import type { ChromeComponentsDeps } from '@kbn/core-chrome-browser-components';
import {
  useChromeStyle,
  useIsChromeVisible,
  useSidebarWidth,
  useSideNavWidth,
} from '@kbn/core-chrome-browser-hooks';
import { useGlobalFooter, useHasHeaderBanner } from '@kbn/core-chrome-browser-hooks/internal';
import { GridLayoutGlobalStyles } from './grid_global_app_style';
import type { LayoutService, LayoutServiceStartDeps } from '../../layout_service';
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
  constructor(private readonly deps: LayoutServiceStartDeps) {}

  /**
   * Returns a layout component with the provided dependencies
   */
  public getComponent(): React.ComponentType {
    const { application, overlays, http, docLinks, customBranding } = this.deps;

    const appComponent = application.getComponent();
    const appBannerComponent = overlays.banners.getComponent();

    const componentDeps: ChromeComponentsDeps = {
      application,
      http,
      docLinks,
      customBranding,
    };

    const GridLayoutContent = React.memo(() => {
      const chromeVisible = useIsChromeVisible();
      const hasHeaderBanner = useHasHeaderBanner();
      const chromeStyle = useChromeStyle();
      const hasAppMenu = useHasAppMenu();
      const footer = useGlobalFooter();
      const sidebarWidth = useSidebarWidth();
      const navigationWidth = useSideNavWidth();

      const layoutConfig = {
        ...layoutConfigs[chromeStyle],
        sidebarWidth,
        navigationWidth,
      };

      // Assign main layout parts first
      let header: ReactNode;
      let navigation: ReactNode;
      let banner: ReactNode;
      let applicationTopBar: ReactNode;

      if (chromeVisible) {
        if (chromeStyle === 'classic') {
          header = <ClassicHeader />;
        } else {
          header = <ProjectHeader />;
          if (hasAppMenu) {
            applicationTopBar = <AppMenuBar />;
          }

          navigation = <GridLayoutProjectSideNav />;
        }
      }

      if (hasHeaderBanner) {
        banner = <HeaderTopBanner position="static" />;
      }

      return (
        <>
          <GridLayoutGlobalStyles chromeStyle={chromeStyle} />
          <ChromeLayoutConfigProvider value={layoutConfig}>
            <ChromeLayout
              header={header}
              sidebar={<Sidebar />}
              footer={footer}
              navigation={navigation}
              banner={banner}
              applicationTopBar={applicationTopBar}
            >
              <>
                {!chromeVisible && <ChromelessHeader />}

                <div id="globalBannerList">{appBannerComponent}</div>
                <AppWrapper chromeVisible={chromeVisible}>
                  <div id={APP_FIXED_VIEWPORT_ID} />
                  {appComponent}
                </AppWrapper>
              </>
            </ChromeLayout>
          </ChromeLayoutConfigProvider>
        </>
      );
    });

    return () => (
      <ChromeComponentsProvider value={componentDeps}>
        <GridLayoutContent />
      </ChromeComponentsProvider>
    );
  }
}
