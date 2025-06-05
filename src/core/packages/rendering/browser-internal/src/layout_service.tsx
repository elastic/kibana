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
import useObservable from 'react-use/lib/useObservable';
import { useSyncPushFlyoutStyles } from './use_sync_push_flyout_styles';
import { AppWrapper } from './app_containers';

export interface LayoutServiceStartDeps {
  application: InternalApplicationStart;
  chrome: InternalChromeStart;
  overlays: OverlayStart;
}

const BANNER_HEIGHT = 32;
const FOOTER_HEIGHT = 0;
const HEADER_HEIGHT = 96;
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
    const chromeBanner = chrome.getHeaderBannerComponent();
    const appComponent = application.getComponent();
    const bannerComponent = overlays.banners.getComponent();

    return React.memo(() => {
      // TODO: optimize state
      const isChromeVisible = useObservable(chrome.getIsVisible$(), false);
      const isChromeBannerVisible = useObservable(chrome.hasHeaderBanner$(), false);
      const pushFlyoutOverrideStyles = useSyncPushFlyoutStyles();

      return (
        <>
          {/* Global Styles that apply across the entire app */}
          <GlobalAppStyle headerHeight={HEADER_HEIGHT} />
          <ChromeLayout
            applicationCSS={pushFlyoutOverrideStyles}
            bannerHeight={BANNER_HEIGHT}
            footerHeight={FOOTER_HEIGHT}
            headerHeight={HEADER_HEIGHT}
            navigationWidth={NAVIGATION_WIDTH}
            navigationPanelWidth={NAVIGATION_PANEL_WIDTH}
            sidebarWidth={SIDEBAR_WIDTH}
            sidebarPanelWidth={SIDEBAR_PANEL_WIDTH}
          >
            {{
              Header: isChromeVisible ? () => chromeHeader : undefined,
              Banner: isChromeBannerVisible ? () => chromeBanner : undefined,
              Application: () => {
                return (
                  <>
                    <div id="globalBannerList">{bannerComponent}</div>
                    <AppWrapper isChromeVisible={isChromeVisible}>
                      {/* Affixes a div to restrict the position of charts tooltip to the visible viewport minus the header */}
                      <div id={APP_FIXED_VIEWPORT_ID} />

                      {/* The actual plugin/app */}
                      {appComponent}
                    </AppWrapper>
                  </>
                );
              },
            }}
          </ChromeLayout>
        </>
      );
    });
  }
}
