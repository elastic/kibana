/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { pairwise, startWith } from 'rxjs/operators';

import { InternalChromeStart } from '../chrome';
import { InternalApplicationStart } from '../application';
import { OverlayStart } from '../overlays';
import { AppWrapper } from './app_containers';

interface StartDeps {
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
  start({ application, chrome, overlays, targetDomElement }: StartDeps) {
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
      <I18nProvider>
        <>
          {/* Fixed headers */}
          {chromeHeader}

          {/* banners$.subscribe() for things like the No data banner */}
          <div id="globalBannerList">{bannerComponent}</div>

          {/* The App Wrapper outside of the fixed headers that accepts custom class names from apps */}
          <AppWrapper chromeVisible$={chrome.getIsVisible$()}>
            {/* Affixes a div to restrict the position of charts tooltip to the visible viewport minus the header */}
            <div id="app-fixed-viewport" />

            {/* The actual plugin/app */}
            {appComponent}
          </AppWrapper>
        </>
      </I18nProvider>,
      targetDomElement
    );
  }
}
