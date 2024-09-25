/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockReactDomRender, mockReactDomUnmount } from './toasts_service.test.mocks';

import { ToastsService } from './toasts_service';
import { ToastsApi } from './toasts_api';
import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { EventReporter } from './telemetry';

const mockI18n: any = {
  Context: function I18nContext() {
    return '';
  },
};

const mockOverlays = overlayServiceMock.createStartContract();
const mockTheme = themeServiceMock.createStartContract();
const mockAnalytics = analyticsServiceMock.createAnalyticsServiceStart();

const eventReporter = new EventReporter({ analytics: mockAnalytics });

describe('#setup()', () => {
  it('returns a ToastsApi', () => {
    const toasts = new ToastsService();

    expect(
      toasts.setup({ uiSettings: uiSettingsServiceMock.createSetupContract() })
    ).toBeInstanceOf(ToastsApi);
  });
});

describe('#start()', () => {
  it('renders the GlobalToastList into the targetDomElement param', async () => {
    const targetDomElement = document.createElement('div');
    targetDomElement.setAttribute('test', 'target-dom-element');
    const toasts = new ToastsService();

    expect(mockReactDomRender).not.toHaveBeenCalled();
    toasts.setup({ uiSettings: uiSettingsServiceMock.createSetupContract() });
    toasts.start({
      analytics: mockAnalytics,
      i18n: mockI18n,
      theme: mockTheme,
      targetDomElement,
      overlays: mockOverlays,
      eventReporter,
    });
    expect(mockReactDomRender.mock.calls).toMatchSnapshot();
  });

  it('returns a ToastsApi', () => {
    const targetDomElement = document.createElement('div');
    const toasts = new ToastsService();

    expect(
      toasts.setup({ uiSettings: uiSettingsServiceMock.createSetupContract() })
    ).toBeInstanceOf(ToastsApi);
    expect(
      toasts.start({
        analytics: mockAnalytics,
        i18n: mockI18n,
        theme: mockTheme,
        targetDomElement,
        overlays: mockOverlays,
        eventReporter,
      })
    ).toBeInstanceOf(ToastsApi);
  });
});

describe('#stop()', () => {
  it('unmounts the GlobalToastList from the targetDomElement', () => {
    const targetDomElement = document.createElement('div');
    targetDomElement.setAttribute('test', 'target-dom-element');
    const toasts = new ToastsService();

    toasts.setup({ uiSettings: uiSettingsServiceMock.createSetupContract() });
    toasts.start({
      analytics: mockAnalytics,
      i18n: mockI18n,
      theme: mockTheme,
      targetDomElement,
      overlays: mockOverlays,
      eventReporter,
    });

    expect(mockReactDomUnmount).not.toHaveBeenCalled();
    toasts.stop();
    expect(mockReactDomUnmount.mock.calls).toMatchSnapshot();
  });

  it('does not fail if setup() was never called', () => {
    const toasts = new ToastsService();
    expect(() => {
      toasts.stop();
    }).not.toThrowError();
  });

  it('empties the content of the targetDomElement', () => {
    const targetDomElement = document.createElement('div');
    const toasts = new ToastsService();

    toasts.setup({ uiSettings: uiSettingsServiceMock.createSetupContract() });
    toasts.start({
      analytics: mockAnalytics,
      i18n: mockI18n,
      theme: mockTheme,
      targetDomElement,
      overlays: mockOverlays,
      eventReporter,
    });
    toasts.stop();
    expect(targetDomElement.childNodes).toHaveLength(0);
  });
});
