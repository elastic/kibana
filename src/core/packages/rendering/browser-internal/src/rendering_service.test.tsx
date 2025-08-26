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
import { coreFeatureFlagsMock } from '@kbn/core-feature-flags-browser-mocks';
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
  let featureFlags: ReturnType<typeof coreFeatureFlagsMock.createStart>;
  let targetDomElement: HTMLDivElement;
  let rendering: RenderingService;

  beforeEach(() => {
    analytics = analyticsServiceMock.createAnalyticsServiceStart();

    application = applicationServiceMock.createInternalStartContract();
    application.getComponent.mockReturnValue(<div>Hello application!</div>);

    chrome = chromeServiceMock.createStartContract();
    chrome.getLegacyHeaderComponentForFixedLayout.mockReturnValue(<div>Hello chrome!</div>);

    overlays = overlayServiceMock.createStartContract();
    overlays.banners.getComponent.mockReturnValue(<div>I&apos;m a banner!</div>);

    executionContext = executionContextServiceMock.createStartContract();
    userProfile = userProfileServiceMock.createStart();
    theme = themeServiceMock.createStartContract();
    i18n = i18nServiceMock.createStartContract();
    featureFlags = coreFeatureFlagsMock.createStart();

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
      service.renderCore({ chrome, application, overlays, featureFlags }, targetDomElement);
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
      service.renderCore({ chrome, application, overlays, featureFlags }, targetDomElement);

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
      service.renderCore({ chrome, application, overlays, featureFlags }, targetDomElement);
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

    it('maintains component identity across multiple calls to prevent remounting', () => {
      const deps = { analytics, executionContext, i18n, theme, userProfile };
      rendering.start(deps);

      // Create a stateful component to test remounting behavior
      let renderCount = 0;
      const StatefulComponent: React.FC = () => {
        const [value, setValue] = React.useState('initial');
        renderCount++;

        React.useEffect(() => {
          setValue('updated');
        }, []);

        return (
          <div>
            <span data-test-subj="render-count">{renderCount}</span>
            <span data-test-subj="state-value">{value}</span>
          </div>
        );
      };

      const TestComponent1 = rendering.addContext(<StatefulComponent />);
      const TestComponent2 = rendering.addContext(<StatefulComponent />);

      // Both components should use the same wrapper component reference
      expect(TestComponent1.type).toBe(TestComponent2.type);

      const { rerender } = render(TestComponent1);

      // Wait for state update
      expect(screen.getByTestId('state-value')).toHaveTextContent('updated');
      const initialRenderCount = screen.getByTestId('render-count').textContent;

      // Re-render the component
      rerender(TestComponent1);

      // Component should not remount, so render count should remain the same
      // and state should be preserved
      expect(screen.getByTestId('state-value')).toHaveTextContent('updated');
      expect(screen.getByTestId('render-count')).toHaveTextContent(initialRenderCount!);
    });

    it('preserves component state and focus during re-renders', () => {
      const deps = { analytics, executionContext, i18n, theme, userProfile };
      rendering.start(deps);

      // Create a component with an input to test focus preservation
      const FocusTestComponent: React.FC = () => {
        const [inputValue, setInputValue] = React.useState('');
        const inputRef = React.useRef<HTMLInputElement>(null);

        return (
          <div>
            <input
              ref={inputRef}
              data-test-subj="test-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <span data-test-subj="input-value">{inputValue}</span>
          </div>
        );
      };

      const TestComponent = rendering.addContext(<FocusTestComponent />);
      const { rerender } = render(TestComponent);

      const input = screen.getByTestId('test-input') as HTMLInputElement;

      // Simulate user typing
      input.focus();
      input.value = 'test';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(document.activeElement).toBe(input);
      expect(input.value).toBe('test');

      // Re-render the component (simulating a parent re-render)
      rerender(TestComponent);

      // Input should still be focused and retain its value
      expect(document.activeElement).toBe(input);
      expect(input.value).toBe('test');
    });
  });
});
