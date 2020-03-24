/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';

import { InternalChromeStart } from '../chrome';
import { InternalApplicationStart } from '../application';
import { InjectedMetadataStart } from '../injected_metadata';
import { OverlayStart } from '../overlays';
import { AppWrapper, AppContainer } from './app_containers';

interface StartDeps {
  application: InternalApplicationStart;
  chrome: InternalChromeStart;
  injectedMetadata: InjectedMetadataStart;
  overlays: OverlayStart;
  targetDomElement: HTMLDivElement;
}

/**
 * Renders all Core UI in a single React tree.
 *
 * @internalRemarks Currently this only renders Chrome UI. Notifications and
 * Overlays UI should be moved here as well.
 *
 * @returns a DOM element for the legacy platform to render into.
 *
 * @internal
 */
export class RenderingService {
  start({
    application,
    chrome,
    injectedMetadata,
    overlays,
    targetDomElement,
  }: StartDeps): RenderingStart {
    const chromeUi = chrome.getHeaderComponent();
    const appUi = application.getComponent();
    const bannerUi = overlays.banners.getComponent();

    const legacyMode = injectedMetadata.getLegacyMode();
    const legacyRef = legacyMode ? React.createRef<HTMLDivElement>() : null;

    ReactDOM.render(
      <I18nProvider>
        <div className="content" data-test-subj="kibanaChrome">
          {chromeUi}

          {!legacyMode && (
            <AppWrapper chromeVisible$={chrome.getIsVisible$()}>
              <div className="app-wrapper-panel">
                <div id="globalBannerList">{bannerUi}</div>
                <AppContainer classes$={chrome.getApplicationClasses$()}>{appUi}</AppContainer>
              </div>
            </AppWrapper>
          )}

          {legacyMode && <div ref={legacyRef} />}
        </div>
      </I18nProvider>,
      targetDomElement
    );

    return {
      // When in legacy mode, return legacy div, otherwise undefined.
      legacyTargetDomElement: legacyRef ? legacyRef.current! : undefined,
    };
  }
}

/** @internal */
export interface RenderingStart {
  legacyTargetDomElement?: HTMLDivElement;
}
