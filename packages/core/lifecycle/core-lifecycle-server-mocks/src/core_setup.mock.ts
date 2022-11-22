/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { httpResourcesMock } from '@kbn/core-http-resources-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import type { CoreSetup, StartServicesAccessor } from '@kbn/core-lifecycle-server';
import type { MockedKeys } from '@kbn/utility-types-jest';
import { analyticsServiceMock } from '@kbn/core-analytics-server-mocks';
import { capabilitiesServiceMock } from '@kbn/core-capabilities-server-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { statusServiceMock } from '@kbn/core-status-server-mocks';
import { loggingServiceMock } from '@kbn/core-logging-server-mocks';
import { metricsServiceMock } from '@kbn/core-metrics-server-mocks';
import { deprecationsServiceMock } from '@kbn/core-deprecations-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { coreUsageDataServiceMock } from '@kbn/core-usage-data-server-mocks';
import { createCoreStartMock } from './core_start.mock';

type CoreSetupMockType = MockedKeys<CoreSetup> & {
  elasticsearch: ReturnType<typeof elasticsearchServiceMock.createSetup>;
  getStartServices: jest.MockedFunction<StartServicesAccessor<any, any>>;
};

export function createCoreSetupMock({
  pluginStartDeps = {},
  pluginStartContract,
}: {
  pluginStartDeps?: object;
  pluginStartContract?: any;
} = {}) {
  const httpMock: jest.Mocked<CoreSetup['http']> = {
    ...httpServiceMock.createSetupContract<RequestHandlerContext>(),
    resources: httpResourcesMock.createRegistrar(),
  };

  const uiSettingsMock = {
    register: uiSettingsServiceMock.createSetupContract().register,
  };

  const mock: CoreSetupMockType = {
    analytics: analyticsServiceMock.createAnalyticsServiceSetup(),
    capabilities: capabilitiesServiceMock.createSetupContract(),
    docLinks: docLinksServiceMock.createSetupContract(),
    elasticsearch: elasticsearchServiceMock.createSetup(),
    http: httpMock,
    i18n: i18nServiceMock.createSetupContract(),
    savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
    status: statusServiceMock.createSetupContract(),
    uiSettings: uiSettingsMock,
    logging: loggingServiceMock.createSetupContract(),
    metrics: metricsServiceMock.createSetupContract(),
    deprecations: deprecationsServiceMock.createSetupContract(),
    executionContext: executionContextServiceMock.createInternalSetupContract(),
    coreUsageData: {
      registerUsageCounter: coreUsageDataServiceMock.createSetupContract().registerUsageCounter,
    },
    getStartServices: jest
      .fn<Promise<[ReturnType<typeof createCoreStartMock>, object, any]>, []>()
      .mockResolvedValue([createCoreStartMock(), pluginStartDeps, pluginStartContract]),
  };

  return mock;
}
