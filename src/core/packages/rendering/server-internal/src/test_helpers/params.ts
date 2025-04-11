/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { statusServiceMock } from '@kbn/core-status-server-mocks';
import { customBrandingServiceMock } from '@kbn/core-custom-branding-server-mocks';
import { userSettingsServiceMock } from '@kbn/core-user-settings-server-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-server-mocks';
import { coreFeatureFlagsMock } from '@kbn/core-feature-flags-server-mocks';

const context = mockCoreContext.create();
const httpPreboot = httpServiceMock.createInternalPrebootContract();
const httpSetup = httpServiceMock.createInternalSetupContract();
const status = statusServiceMock.createInternalSetupContract();
const elasticsearch = elasticsearchServiceMock.createInternalSetup();
const customBranding = customBrandingServiceMock.createSetupContract();
const userSettings = userSettingsServiceMock.createSetupContract();

function createUiPlugins() {
  return {
    browserConfigs: new Map(),
    internal: new Map(),
    public: new Map(),
  };
}

export const mockRenderingServiceParams = context;
export const mockRenderingPrebootDeps = {
  http: httpPreboot,
  uiPlugins: createUiPlugins(),
  i18n: i18nServiceMock.createInternalPrebootContract(),
};
export const mockRenderingSetupDeps = {
  elasticsearch,
  featureFlags: coreFeatureFlagsMock.createInternalSetup(),
  http: httpSetup,
  uiPlugins: createUiPlugins(),
  customBranding,
  status,
  userSettings,
  i18n: i18nServiceMock.createSetupContract(),
};
export const mockRenderingStartDeps = {
  featureFlags: coreFeatureFlagsMock.createStart(),
};
