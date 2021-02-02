/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { RenderingService } from './rendering_service';
import { applicationServiceMock } from '../application/application_service.mock';
import { chromeServiceMock } from '../chrome/chrome_service.mock';
import { overlayServiceMock } from '../overlays/overlay_service.mock';
import { BehaviorSubject } from 'rxjs';

describe('RenderingService#start', () => {
  let application: ReturnType<typeof applicationServiceMock.createInternalStartContract>;
  let chrome: ReturnType<typeof chromeServiceMock.createStartContract>;
  let overlays: ReturnType<typeof overlayServiceMock.createStartContract>;
  let targetDomElement: HTMLDivElement;
  let rendering: RenderingService;

  beforeEach(() => {
    application = applicationServiceMock.createInternalStartContract();
    application.getComponent.mockReturnValue(<div>Hello application!</div>);

    chrome = chromeServiceMock.createStartContract();
    chrome.getHeaderComponent.mockReturnValue(<div>Hello chrome!</div>);

    overlays = overlayServiceMock.createStartContract();
    overlays.banners.getComponent.mockReturnValue(<div>I&apos;m a banner!</div>);

    targetDomElement = document.createElement('div');

    rendering = new RenderingService();
  });

  const startService = () => {
    return rendering.start({
      application,
      chrome,
      overlays,
      targetDomElement,
    });
  };

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
