/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
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
    const chromeHeader = chrome.getClassicHeaderComponentForGridLayout();
    const appComponent = application.getComponent();
    const bannerComponent = overlays.banners.getComponent();
    // chromeless header is used when chrome is not visible and responsible for displaying the data-test-subj and fixed loading bar
    const chromelessHeader = chrome.getChromelessHeader();
    const headerBanner = chrome.getHeaderBanner();
    const hasHeaderBanner$ = chrome.hasHeaderBanner$();
    const chromeVisible$ = chrome.getIsVisible$();
    const debug = this.params.debug ?? false;

    return React.memo(() => {
      // TODO: optimize initial value to avoid unnecessary re-renders
      const chromeVisible = useObservable(chromeVisible$, false);
      const hasHeaderBanner = useObservable(hasHeaderBanner$, false);

      return (
        <>
          <GridLayoutGlobalStyles />
          <ChromeLayoutConfigProvider value={layoutConfig}>
            <ChromeLayout
              header={chromeVisible && chromeHeader}
              sidebar={
                chromeVisible && debug ? <SimpleDebugOverlay label="Debug Sidebar" /> : undefined
              }
              footer={
                chromeVisible && debug ? <SimpleDebugOverlay label="Debug Footer" /> : undefined
              }
              navigation={
                chromeVisible && debug ? (
                  <SimpleDebugOverlay label="Debug Nav" style={{ transform: 'rotate(180deg)' }} />
                ) : undefined
              }
              banner={
                hasHeaderBanner ? (
                  headerBanner
                ) : debug ? (
                  <SimpleDebugOverlay label="Debug Banner" />
                ) : undefined
              }
            >
              <>
                {/* If chrome is not visible, we use the chromeless header to display the*/}
                {/* data-test-subj and fixed loading bar*/}
                {!chromeVisible && chromelessHeader}

                <div id="globalBannerList">{bannerComponent}</div>
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
