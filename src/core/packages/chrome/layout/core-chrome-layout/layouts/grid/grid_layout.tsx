/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode } from 'react';
import {
  ChromeLayout,
  ChromeLayoutConfigProvider,
  ChromeLayoutConfig,
  SimpleDebugOverlay,
} from '@kbn/core-chrome-layout-components';
import useObservable from 'react-use/lib/useObservable';
import { GridLayoutGlobalStyles } from './grid_global_app_style';
import type {
  LayoutService,
  LayoutServiceStartDeps,
  LayoutServiceParams,
} from '../../layout_service';
import { AppWrapper } from '../../app_containers';
import { APP_FIXED_VIEWPORT_ID } from '../../app_fixed_viewport';

const layoutConfig: ChromeLayoutConfig = {
  headerHeight: 96,
  bannerHeight: 32,

  /** for debug for now */
  sidebarWidth: 48,
  footerHeight: 48,
  navigationWidth: 48,
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
    const debug = this.params.debug ?? false;

    const chromeHeader = chrome.getClassicHeaderComponentForGridLayout();
    const headerBanner = chrome.getHeaderBanner();

    // chromeless header is used when chrome is not visible and responsible for displaying the data-test-subj and fixed loading bar
    const chromelessHeader = chrome.getChromelessHeader();

    return React.memo(() => {
      // TODO: Get rid of observables https://github.com/elastic/kibana/issues/225265
      const chromeVisible = useObservable(chromeVisible$, false);
      const hasHeaderBanner = useObservable(hasHeaderBanner$, false);

      // Assign main layout parts first
      const header: ReactNode = chromeVisible && chromeHeader;
      let banner: ReactNode = hasHeaderBanner ? headerBanner : undefined;

      // not implemented
      let sidebar: ReactNode;
      let footer: ReactNode;
      let navigation: ReactNode;

      // If debug, override/add debug overlays
      if (debug) {
        if (chromeVisible) {
          if (!sidebar) sidebar = <SimpleDebugOverlay label="Debug Sidebar" />;
          if (!footer) footer = <SimpleDebugOverlay label="Debug Footer" />;
          if (!navigation)
            navigation = (
              <SimpleDebugOverlay label="Debug Nav" style={{ transform: 'rotate(180deg)' }} />
            );
        }
        // banner is visible even when chrome is not visible
        if (!banner) {
          banner = <SimpleDebugOverlay label="Debug Banner" />;
        }
      }

      return (
        <>
          <GridLayoutGlobalStyles />
          <ChromeLayoutConfigProvider value={layoutConfig}>
            <ChromeLayout
              header={header}
              sidebar={sidebar}
              footer={footer}
              navigation={navigation}
              banner={banner}
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
