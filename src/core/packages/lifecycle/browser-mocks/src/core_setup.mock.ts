/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-browser-mocks';
import { fatalErrorsServiceMock } from '@kbn/core-fatal-errors-browser-mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { uiSettingsServiceMock, settingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { deprecationsServiceMock } from '@kbn/core-deprecations-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { customBrandingServiceMock } from '@kbn/core-custom-branding-browser-mocks';
import { securityServiceMock } from '@kbn/core-security-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { createCoreStartMock } from './core_start.mock';
import { coreFeatureFlagsMock } from '@kbn/core-feature-flags-browser-mocks';

export function createCoreSetupMock({
  basePath = '',
  pluginStartDeps = {},
  pluginStartContract,
}: {
  basePath?: string;
  pluginStartDeps?: object;
  pluginStartContract?: any;
} = {}) {
  const mock = {
    analytics: analyticsServiceMock.createAnalyticsServiceSetup(),
    application: applicationServiceMock.createSetupContract(),
    customBranding: customBrandingServiceMock.createSetupContract(),
    docLinks: docLinksServiceMock.createSetupContract(),
    executionContext: executionContextServiceMock.createSetupContract(),
    fatalErrors: fatalErrorsServiceMock.createSetupContract(),
    featureFlags: coreFeatureFlagsMock.createSetup(),
    getStartServices: jest.fn<Promise<[ReturnType<typeof createCoreStartMock>, any, any]>, []>(() =>
      Promise.resolve([createCoreStartMock({ basePath }), pluginStartDeps, pluginStartContract])
    ),
    http: httpServiceMock.createSetupContract({ basePath }),
    notifications: notificationServiceMock.createSetupContract(),
    uiSettings: uiSettingsServiceMock.createSetupContract(),
    settings: settingsServiceMock.createSetupContract(),
    deprecations: deprecationsServiceMock.createSetupContract(),
    theme: themeServiceMock.createSetupContract(),
    security: securityServiceMock.createSetup(),
    userProfile: userProfileServiceMock.createSetup(),
    plugins: {
      onSetup: jest.fn(),
      onStart: jest.fn(),
    },
  };

  return mock;
}
