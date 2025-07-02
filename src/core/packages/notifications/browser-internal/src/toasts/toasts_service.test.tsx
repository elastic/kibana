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
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { renderingServiceMock } from '@kbn/core-rendering-browser-mocks';
import { notificationCoordinator, Coordinator } from '../notification_coordinator';

const mockOverlays = overlayServiceMock.createStartContract();
const mockAnalytics = analyticsServiceMock.createAnalyticsServiceStart();
const mockRendering = renderingServiceMock.create();

const mockAnalyticsSetup = analyticsServiceMock.createAnalyticsServiceSetup();

const coordinator = notificationCoordinator.bind(new Coordinator());

describe('#setup()', () => {
  it('returns a ToastsApi', () => {
    const toasts = new ToastsService();

    expect(
      toasts.setup({
        uiSettings: uiSettingsServiceMock.createSetupContract(),
        analytics: mockAnalyticsSetup,
      })
    ).toBeInstanceOf(ToastsApi);
  });
});

describe('#start()', () => {
  it('renders the GlobalToastList into the targetDomElement param', async () => {
    const targetDomElement = document.createElement('div');
    targetDomElement.setAttribute('test', 'target-dom-element');
    const toasts = new ToastsService();

    expect(mockReactDomRender).not.toHaveBeenCalled();
    toasts.setup({
      uiSettings: uiSettingsServiceMock.createSetupContract(),
      analytics: mockAnalyticsSetup,
    });
    toasts.start({
      rendering: mockRendering,
      targetDomElement,
      overlays: mockOverlays,
      analytics: mockAnalytics,
      notificationCoordinator: coordinator,
    });
    expect(mockReactDomRender.mock.calls).toMatchSnapshot();
  });

  it('returns a ToastsApi', () => {
    const targetDomElement = document.createElement('div');
    const toasts = new ToastsService();

    expect(
      toasts.setup({
        uiSettings: uiSettingsServiceMock.createSetupContract(),
        analytics: mockAnalyticsSetup,
      })
    ).toBeInstanceOf(ToastsApi);
    expect(
      toasts.start({
        rendering: mockRendering,
        targetDomElement,
        overlays: mockOverlays,
        analytics: mockAnalytics,
        notificationCoordinator: coordinator,
      })
    ).toBeInstanceOf(ToastsApi);
  });
});

describe('#stop()', () => {
  it('unmounts the GlobalToastList from the targetDomElement', () => {
    const targetDomElement = document.createElement('div');
    targetDomElement.setAttribute('test', 'target-dom-element');
    const toasts = new ToastsService();

    toasts.setup({
      uiSettings: uiSettingsServiceMock.createSetupContract(),
      analytics: mockAnalyticsSetup,
    });
    toasts.start({
      rendering: mockRendering,
      targetDomElement,
      overlays: mockOverlays,
      analytics: mockAnalytics,
      notificationCoordinator: coordinator,
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

    toasts.setup({
      uiSettings: uiSettingsServiceMock.createSetupContract(),
      analytics: mockAnalyticsSetup,
    });
    toasts.start({
      rendering: mockRendering,
      targetDomElement,
      overlays: mockOverlays,
      analytics: mockAnalytics,
      notificationCoordinator: coordinator,
    });
    toasts.stop();
    expect(targetDomElement.childNodes).toHaveLength(0);
  });
});
