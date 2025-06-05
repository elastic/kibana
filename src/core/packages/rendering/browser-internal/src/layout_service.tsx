/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import { GlobalAppStyle } from '@kbn/core-application-common';
import { APP_FIXED_VIEWPORT_ID } from '@kbn/core-rendering-browser';
import { ChromeLayout } from '@kbn/core-chrome-layout-components';
import { AppWrapper } from './app_containers';
import useObservable from 'react-use/lib/useObservable';

export interface LayoutServiceStartDeps {
  application: InternalApplicationStart;
  chrome: InternalChromeStart;
  overlays: OverlayStart;
}

const BANNER_HEIGHT = 0; // TODO
const FOOTER_HEIGHT = 0;
const HEADER_HEIGHT = 96; // TODO
const NAVIGATION_WIDTH = 0; // TODO
const NAVIGATION_PANEL_WIDTH = 0;
const SIDEBAR_WIDTH = 0;
const SIDEBAR_PANEL_WIDTH = 0;

/**
 * Service for providing layout component wired to other core services.
 */
export class LayoutService {
  constructor(private deps: LayoutServiceStartDeps) {}

  /**
   * Returns a layout component with the provided dependencies
   */
  public getComponent(): React.ComponentType {
    const { application, chrome, overlays } = this.deps;
    const chromeHeader = chrome.getHeaderComponent();
    const appComponent = application.getComponent();
    // const bannerComponent = overlays.banners.getComponent();
    // Example layout; replace with actual layout logic as needed
    return () => {
      const isChromeVisible = useObservable(chrome.getIsVisible$(), false);
      return (
        <>
          {/* Global Styles that apply across the entire app */}
          <GlobalAppStyle />
          <ChromeLayout
            bannerHeight={BANNER_HEIGHT}
            footerHeight={FOOTER_HEIGHT}
            headerHeight={HEADER_HEIGHT}
            navigationWidth={NAVIGATION_WIDTH}
            navigationPanelWidth={NAVIGATION_PANEL_WIDTH}
            sidebarWidth={SIDEBAR_WIDTH}
            sidebarPanelWidth={SIDEBAR_PANEL_WIDTH}
          >
            {{
              Header: () => chromeHeader,
              Navigation: () => <div>Navigation</div>,
              Application: () => (
                <AppWrapper isChromeVisible={isChromeVisible}>
                  {/* Affixes a div to restrict the position of charts tooltip to the visible viewport minus the header */}
                  <div id={APP_FIXED_VIEWPORT_ID} />

                  {/* The actual plugin/app */}
                  {appComponent}
                </AppWrapper>
              ),
            }}
          </ChromeLayout>
        </>
        // <>
        //   {/* Global Styles that apply across the entire app */}
        //   <GlobalAppStyle />
        //
        //   {/* Fixed headers */}
        //   {chromeHeader}
        //
        //   {/* banners$.subscribe() for things like the No data banner */}
        //   <div id="globalBannerList">{bannerComponent}</div>
        //
        //   {/* The App Wrapper outside of the fixed headers that accepts custom class names from apps */}
        //   <AppWrapper chromeVisible$={chrome.getIsVisible$()}>
        //     {/* Affixes a div to restrict the position of charts tooltip to the visible viewport minus the header */}
        //     <div id={APP_FIXED_VIEWPORT_ID} />
        //
        //     {/* The actual plugin/app */}
        //     {appComponent}
        //   </AppWrapper>
        // </>
      );
    };
  }
}
