/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { pairwise, startWith } from 'rxjs';

import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { KibanaRootContextProvider } from '@kbn/react-kibana-context-root';
import { APP_FIXED_VIEWPORT_ID } from '@kbn/core-rendering-browser';
import { AppWrapper } from './app_containers';

interface StartServices {
  analytics: AnalyticsServiceStart;
  i18n: I18nStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
}

export interface StartDeps extends StartServices {
  application: InternalApplicationStart;
  chrome: InternalChromeStart;
  overlays: OverlayStart;
  targetDomElement: HTMLDivElement;
}

/**
 * Renders all Core UI in a single React tree.
 *
 * @internalRemarks Currently this only renders Chrome UI. Notifications and
 * Overlays UI should be moved here as well.
 *
 * @internal
 */
export class RenderingService {
  start({ application, chrome, overlays, targetDomElement, ...startServices }: StartDeps) {
    const chromeHeader = chrome.getHeaderComponent();
    const appComponent = application.getComponent();
    const bannerComponent = overlays.banners.getComponent();

    const body = document.querySelector('body')!;
    chrome
      .getBodyClasses$()
      .pipe(startWith<string[]>([]), pairwise())
      .subscribe(([previousClasses, newClasses]) => {
        body.classList.remove(...previousClasses);
        body.classList.add(...newClasses);
      });

    ReactDOM.render(
      <KibanaRootContextProvider {...startServices} globalStyles={true}>
        <>
          {/* Fixed headers */}
          {chromeHeader}

          {/* banners$.subscribe() for things like the No data banner */}
          <div id="globalBannerList">{bannerComponent}</div>

          {/* The App Wrapper outside of the fixed headers that accepts custom class names from apps */}
          <AppWrapper chromeVisible$={chrome.getIsVisible$()}>
            {/* Affixes a div to restrict the position of charts tooltip to the visible viewport minus the header */}
            <div id={APP_FIXED_VIEWPORT_ID} />

            {/* The actual plugin/app */}
            {appComponent}
          </AppWrapper>
        </>
      </KibanaRootContextProvider>,
      targetDomElement
    );
  }
}
