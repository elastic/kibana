/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import { fatalErrorsServiceMock } from '@kbn/core-fatal-errors-browser-mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { uiSettingsServiceMock, settingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { deprecationsServiceMock } from '@kbn/core-deprecations-browser-mocks';
import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { customBrandingServiceMock } from '@kbn/core-custom-branding-browser-mocks';

export function createCoreStartMock({ basePath = '' } = {}) {
  const mock = {
    analytics: analyticsServiceMock.createAnalyticsServiceStart(),
    application: applicationServiceMock.createStartContract(),
    chrome: chromeServiceMock.createStartContract(),
    customBranding: customBrandingServiceMock.createStartContract(),
    docLinks: docLinksServiceMock.createStartContract(),
    executionContext: executionContextServiceMock.createStartContract(),
    http: httpServiceMock.createStartContract({ basePath }),
    i18n: i18nServiceMock.createStartContract(),
    notifications: notificationServiceMock.createStartContract(),
    overlays: overlayServiceMock.createStartContract(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
    settings: settingsServiceMock.createStartContract(),
    savedObjects: savedObjectsServiceMock.createStartContract(),
    deprecations: deprecationsServiceMock.createStartContract(),
    theme: themeServiceMock.createStartContract(),
    fatalErrors: fatalErrorsServiceMock.createStartContract(),
  };

  return mock;
}
