/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { uiSettingsServiceMock, settingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { renderingServiceMock } from '@kbn/core-rendering-browser-mocks';
import { NotificationsService } from './notifications_service';

jest.mock('react-dom', () => ({
  render: jest.fn(),
  unmountComponentAtNode: jest.fn(),
}));

describe('NotificationsService', () => {
  const setupAndStart = (targetDomElement: HTMLElement) => {
    const service = new NotificationsService();
    service.setup({
      uiSettings: uiSettingsServiceMock.createSetupContract(),
      analytics: analyticsServiceMock.createAnalyticsServiceSetup(),
    });
    service.start({
      overlays: overlayServiceMock.createStartContract(),
      rendering: renderingServiceMock.create(),
      analytics: analyticsServiceMock.createAnalyticsServiceStart(),
      settings: settingsServiceMock.createStartContract(),
      targetDomElement,
    });
    return service;
  };

  it('marks the toasts container to preserve its z-index in full-screen data grids', () => {
    const targetDomElement = document.createElement('div');
    const service = setupAndStart(targetDomElement);

    const toastsContainer = targetDomElement.firstElementChild;
    expect(toastsContainer).not.toBeNull();
    expect(toastsContainer!.getAttribute('data-kbn-preserve-zindex')).toBe('true');

    service.stop();
  });
});
