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
} from '@kbn/core-chrome-layout-components';
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
  sidebarWidth: 48,
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
    const chromeVisible$ = chrome.getIsVisible$();
    const debug = this.params.debug ?? false;

    return React.memo(() => {
      return (
        <>
          <GridLayoutGlobalStyles />
          <ChromeLayoutConfigProvider value={layoutConfig}>
            <ChromeLayout header={chromeHeader} sidebar={debug ? 'sidebar can be here' : undefined}>
              <>
                <div id="globalBannerList">{bannerComponent}</div>
                <AppWrapper chromeVisible$={chromeVisible$}>
                  {/* TODO: test and fix this */}
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
