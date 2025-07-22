/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { LegacyFixedLayoutGlobalStyles } from './legacy_fixed_global_app_style';
import { LayoutService, LayoutServiceStartDeps } from '../../layout_service';
import { AppWrapper } from '../../app_containers';
import { APP_FIXED_VIEWPORT_ID } from '../../app_fixed_viewport';

/**
 * Service for providing layout component wired to other core services.
 */
export class LegacyFixedLayout implements LayoutService {
  constructor(private deps: LayoutServiceStartDeps) {}

  /**
   * Returns a layout component with the provided dependencies
   */
  public getComponent(): React.ComponentType {
    const { chrome, overlays, application } = this.deps;
    const chromeHeader = chrome.getLegacyHeaderComponentForFixedLayout();
    const bannerComponent = overlays.banners.getComponent();
    const appComponent = application.getComponent();
    const chromeVisible$ = chrome.getIsVisible$();

    return React.memo(() => {
      // TODO: Get rid of observables https://github.com/elastic/kibana/issues/225265
      const chromeVisible = useObservable(chromeVisible$, false);

      return (
        <>
          {/* Global Styles that apply across the entire app */}
          {<LegacyFixedLayoutGlobalStyles />}

          {/* Fixed headers */}
          {chromeHeader}

          {/* banners$.subscribe() for things like the No data banner */}
          <div id="globalBannerList">{bannerComponent}</div>
          {/* The App Wrapper outside of the fixed headers that accepts custom class names from apps */}
          <AppWrapper chromeVisible={chromeVisible}>
            {/* Affixes a div to restrict the position of charts tooltip to the visible viewport minus the header */}
            <div id={APP_FIXED_VIEWPORT_ID} />
            {/* The actual plugin/app */}
            {appComponent}
          </AppWrapper>
        </>
      );
    });
  }
}
