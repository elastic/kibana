/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';

import { InternalChromeStart } from '../chrome';
import { InternalApplicationStart } from '../application';
import { OverlayStart } from '../overlays';
import { AppWrapper, AppContainer } from './app_containers';

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
    const chromeUi = chrome.getHeaderComponent();
    const appUi = application.getComponent();
    const bannerUi = overlays.banners.getComponent();

    ReactDOM.render(
      <I18nProvider>
        <div className="content" data-test-subj="kibanaChrome">
          {chromeUi}

          <AppWrapper chromeVisible$={chrome.getIsVisible$()}>
            <div className="app-wrapper-panel">
              <div id="globalBannerList">{bannerUi}</div>
              <AppContainer classes$={chrome.getApplicationClasses$()}>{appUi}</AppContainer>
            </div>
          </AppWrapper>
        </div>
      </I18nProvider>,
      targetDomElement
    );
  }
}
