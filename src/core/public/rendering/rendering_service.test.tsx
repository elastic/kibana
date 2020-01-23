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
import { act } from 'react-dom/test-utils';

import { RenderingService } from './rendering_service';
import { applicationServiceMock } from '../application/application_service.mock';
import { chromeServiceMock } from '../chrome/chrome_service.mock';
import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { overlayServiceMock } from '../overlays/overlay_service.mock';
import { BehaviorSubject } from 'rxjs';

describe('RenderingService#start', () => {
  let application: ReturnType<typeof applicationServiceMock.createInternalStartContract>;
  let chrome: ReturnType<typeof chromeServiceMock.createStartContract>;
  let overlays: ReturnType<typeof overlayServiceMock.createStartContract>;
  let injectedMetadata: ReturnType<typeof injectedMetadataServiceMock.createStartContract>;
  let targetDomElement: HTMLDivElement;
  let rendering: RenderingService;

  beforeEach(() => {
    application = applicationServiceMock.createInternalStartContract();
    application.getComponent.mockReturnValue(<div>Hello application!</div>);

    chrome = chromeServiceMock.createStartContract();
    chrome.getHeaderComponent.mockReturnValue(<div>Hello chrome!</div>);

    overlays = overlayServiceMock.createStartContract();
    overlays.banners.getComponent.mockReturnValue(<div>I&apos;m a banner!</div>);

    injectedMetadata = injectedMetadataServiceMock.createStartContract();

    targetDomElement = document.createElement('div');

    rendering = new RenderingService();
  });

  const startService = () => {
    return rendering.start({
      application,
      chrome,
      injectedMetadata,
      overlays,
      targetDomElement,
    });
  };

  describe('standard mode', () => {
    beforeEach(() => {
      injectedMetadata.getLegacyMode.mockReturnValue(false);
    });

    it('renders application service into provided DOM element', () => {
      startService();
      expect(targetDomElement.querySelector('div.application')).toMatchInlineSnapshot(`
              <div
                class="application class-name"
              >
                <div>
                  Hello application!
                </div>
              </div>
          `);
    });

    it('adds the `chrome-hidden` class to the AppWrapper when chrome is hidden', () => {
      const isVisible$ = new BehaviorSubject(true);
      chrome.getIsVisible$.mockReturnValue(isVisible$);
      startService();

      const appWrapper = targetDomElement.querySelector('div.app-wrapper')!;
      expect(appWrapper.className).toEqual('app-wrapper');

      act(() => isVisible$.next(false));
      expect(appWrapper.className).toEqual('app-wrapper hidden-chrome');

      act(() => isVisible$.next(true));
      expect(appWrapper.className).toEqual('app-wrapper');
    });

    it('adds the application classes to the AppContainer', () => {
      const applicationClasses$ = new BehaviorSubject<string[]>([]);
      chrome.getApplicationClasses$.mockReturnValue(applicationClasses$);
      startService();

      const appContainer = targetDomElement.querySelector('div.application')!;
      expect(appContainer.className).toEqual('application');

      act(() => applicationClasses$.next(['classA', 'classB']));
      expect(appContainer.className).toEqual('application classA classB');

      act(() => applicationClasses$.next(['classC']));
      expect(appContainer.className).toEqual('application classC');

      act(() => applicationClasses$.next([]));
      expect(appContainer.className).toEqual('application');
    });

    it('contains wrapper divs', () => {
      startService();
      expect(targetDomElement.querySelector('div.app-wrapper')).toBeDefined();
      expect(targetDomElement.querySelector('div.app-wrapper-pannel')).toBeDefined();
    });

    it('renders the banner UI', () => {
      startService();
      expect(targetDomElement.querySelector('#globalBannerList')).toMatchInlineSnapshot(`
              <div
                id="globalBannerList"
              >
                <div>
                  I'm a banner!
                </div>
              </div>
          `);
    });
  });

  describe('legacy mode', () => {
    beforeEach(() => {
      injectedMetadata.getLegacyMode.mockReturnValue(true);
    });

    it('renders into provided DOM element', () => {
      startService();

      expect(targetDomElement).toMatchInlineSnapshot(`
          <div>
            <div
              class="content"
              data-test-subj="kibanaChrome"
            >
              <div>
                Hello chrome!
              </div>
              <div />
            </div>
          </div>
      `);
    });

    it('returns a div for the legacy service to render into', () => {
      const { legacyTargetDomElement } = startService();

      expect(targetDomElement.contains(legacyTargetDomElement!)).toBe(true);
    });
  });
});
