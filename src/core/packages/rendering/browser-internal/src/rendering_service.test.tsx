/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { BehaviorSubject } from 'rxjs';

jest.mock('@kbn/react-kibana-context-render', () => ({
  KibanaRenderContextProvider: jest.fn(({ children }) => (
    <div data-test-subj="kibana-render-context">{children}</div>
  )),
}));
jest.mock('@elastic/eui', () => {
  const actualEui = jest.requireActual('@elastic/eui');
  return {
    ...actualEui,
    EuiLoadingSpinner: jest.fn(() => <div>Loading...</div>),
  };
});

import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-browser-mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import { RenderingService } from './rendering_service';

describe('RenderingService', () => {
  let analytics: ReturnType<typeof analyticsServiceMock.createAnalyticsServiceStart>;
  let application: ReturnType<typeof applicationServiceMock.createInternalStartContract>;
  let chrome: ReturnType<typeof chromeServiceMock.createStartContract>;
  let executionContext: ReturnType<typeof executionContextServiceMock.createStartContract>;
  let overlays: ReturnType<typeof overlayServiceMock.createStartContract>;
  let i18n: ReturnType<typeof i18nServiceMock.createStartContract>;
  let theme: ReturnType<typeof themeServiceMock.createStartContract>;
  let userProfile: ReturnType<typeof userProfileServiceMock.createStart>;
  let targetDomElement: HTMLDivElement;
  let rendering: RenderingService;

  beforeEach(() => {
    analytics = analyticsServiceMock.createAnalyticsServiceStart();

    application = applicationServiceMock.createInternalStartContract();
    application.getComponent.mockReturnValue(<div>Hello application!</div>);

    chrome = chromeServiceMock.createStartContract();
    chrome.getHeaderComponent.mockReturnValue(<div>Hello chrome!</div>);

    overlays = overlayServiceMock.createStartContract();
    overlays.banners.getComponent.mockReturnValue(<div>I&apos;m a banner!</div>);

    executionContext = executionContextServiceMock.createStartContract();
    userProfile = userProfileServiceMock.createStart();
    theme = themeServiceMock.createStartContract();
    i18n = i18nServiceMock.createStartContract();

    targetDomElement = document.createElement('div');
    rendering = new RenderingService();
  });

  describe('renderCore', () => {
    const startService = () => {
      return rendering.start({
        analytics,
        i18n,
        executionContext,
        theme,
        userProfile,
      });
    };

    it('renders application service into provided DOM element', () => {
      const service = startService();
      service.renderCore({ chrome, application, overlays }, targetDomElement);
      expect(targetDomElement.querySelector('div.kbnAppWrapper')).toMatchInlineSnapshot(`
        <div
          class="kbnAppWrapper kbnAppWrapper--hiddenChrome"
          data-test-subj="kbnAppWrapper hiddenChrome"
        >
          <div
            id="app-fixed-viewport"
          />
          <div>
            Hello application!
          </div>
        </div>
      `);
    });

    it('adds the `kbnAppWrapper--hiddenChrome` class to the AppWrapper when chrome is hidden', () => {
      const isVisible$ = new BehaviorSubject(true);
      chrome.getIsVisible$.mockReturnValue(isVisible$);
      const service = startService();
      service.renderCore({ chrome, application, overlays }, targetDomElement);

      const appWrapper = targetDomElement.querySelector('div.kbnAppWrapper')!;
      expect(appWrapper.className).toEqual('kbnAppWrapper');

      act(() => isVisible$.next(false));
      expect(appWrapper.className).toEqual('kbnAppWrapper kbnAppWrapper--hiddenChrome');

      act(() => isVisible$.next(true));
      expect(appWrapper.className).toEqual('kbnAppWrapper');
    });

    it('contains wrapper divs', () => {
      startService();
      expect(targetDomElement.querySelector('div.kbnAppWrapper')).toBeDefined();
    });

    it('renders the banner UI', () => {
      const service = startService();
      service.renderCore({ chrome, application, overlays }, targetDomElement);
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

    it('adds global styles via `KibanaRootRenderingContext` `globalStyles` configuration', () => {
      startService();
      expect(document.querySelector(`style[data-emotion="eui-styles-global"]`)).toBeDefined();
    });
  });

  describe('addContext', () => {
    it('renders loading spinner when dependencies are null', () => {
      const TestComponent = rendering.addContext(<div>Test Element</div>);

      render(TestComponent);

      expect(screen.getByText('Loading...')).toBeTruthy();
    });

    it('renders the React element when dependencies are provided', () => {
      const deps = { analytics, executionContext, i18n, theme, userProfile };
      rendering.start(deps);

      const TestComponent = rendering.addContext(<div>Test Element</div>);

      render(TestComponent);

      expect(screen.getByText('Test Element')).toBeInTheDocument();
      expect(screen.getByTestId('kibana-render-context')).toBeInTheDocument();
    });
  });
});
