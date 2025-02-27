/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { analyticsServiceMock } from '@kbn/core-analytics-server-mocks';
import { capabilitiesServiceMock } from '@kbn/core-capabilities-server-mocks';
import { deprecationsServiceMock } from '@kbn/core-deprecations-server-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { environmentServiceMock } from '@kbn/core-environment-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { httpResourcesMock } from '@kbn/core-http-resources-server-mocks';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-server-mocks';
import { loggingServiceMock } from '@kbn/core-logging-server-mocks';
import { metricsServiceMock } from '@kbn/core-metrics-server-mocks';
import { renderingServiceMock } from '@kbn/core-rendering-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { statusServiceMock } from '@kbn/core-status-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { coreUsageDataServiceMock } from '@kbn/core-usage-data-server-mocks';
import { customBrandingServiceMock } from '@kbn/core-custom-branding-server-mocks';
import { userSettingsServiceMock } from '@kbn/core-user-settings-server-mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-server-mocks';
import { coreFeatureFlagsMock } from '@kbn/core-feature-flags-server-mocks';

export function createInternalCoreSetupMock() {
  const setupDeps = {
    analytics: analyticsServiceMock.createAnalyticsServiceSetup(),
    capabilities: capabilitiesServiceMock.createSetupContract(),
    context: contextServiceMock.createSetupContract(),
    docLinks: docLinksServiceMock.createSetupContract(),
    elasticsearch: elasticsearchServiceMock.createInternalSetup(),
    featureFlags: coreFeatureFlagsMock.createInternalSetup(),
    http: httpServiceMock.createInternalSetupContract(),
    savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
    status: statusServiceMock.createInternalSetupContract(),
    environment: environmentServiceMock.createSetupContract(),
    i18n: i18nServiceMock.createSetupContract(),
    httpResources: httpResourcesMock.createSetupContract(),
    rendering: renderingServiceMock.createSetupContract(),
    uiSettings: uiSettingsServiceMock.createSetupContract(),
    logging: loggingServiceMock.createInternalSetupContract(),
    metrics: metricsServiceMock.createInternalSetupContract(),
    deprecations: deprecationsServiceMock.createInternalSetupContract(),
    executionContext: executionContextServiceMock.createInternalSetupContract(),
    coreUsageData: coreUsageDataServiceMock.createSetupContract(),
    customBranding: customBrandingServiceMock.createSetupContract(),
    userSettings: userSettingsServiceMock.createSetupContract(),
    security: securityServiceMock.createInternalSetup(),
    userProfile: userProfileServiceMock.createInternalSetup(),
  };
  return setupDeps;
}
