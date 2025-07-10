/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { analyticsServiceMock } from '@kbn/core-analytics-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { httpResourcesMock } from '@kbn/core-http-resources-server-mocks';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { loggingServiceMock } from '@kbn/core-logging-server-mocks';
import { prebootServiceMock } from '@kbn/core-preboot-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';

export function createInternalCorePrebootMock() {
  const prebootDeps = {
    analytics: analyticsServiceMock.createAnalyticsServicePreboot(),
    context: contextServiceMock.createPrebootContract(),
    elasticsearch: elasticsearchServiceMock.createInternalPreboot(),
    http: httpServiceMock.createInternalPrebootContract(),
    httpResources: httpResourcesMock.createPrebootContract(),
    uiSettings: uiSettingsServiceMock.createPrebootContract(),
    logging: loggingServiceMock.createInternalPrebootContract(),
    preboot: prebootServiceMock.createInternalPrebootContract(),
  };
  return prebootDeps;
}
