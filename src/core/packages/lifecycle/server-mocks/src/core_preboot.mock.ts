/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-server-mocks';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { prebootServiceMock } from '@kbn/core-preboot-server-mocks';
import type { MockedKeys } from '@kbn/utility-types-jest';
import type { CorePreboot } from '@kbn/core-lifecycle-server';

type CorePrebootMockType = MockedKeys<CorePreboot> & {
  elasticsearch: ReturnType<typeof elasticsearchServiceMock.createPreboot>;
};

export function createCorePrebootMock() {
  const mock: CorePrebootMockType = {
    analytics: analyticsServiceMock.createAnalyticsServicePreboot(),
    elasticsearch: elasticsearchServiceMock.createPreboot(),
    http: httpServiceMock.createPrebootContract() as CorePrebootMockType['http'],
    preboot: prebootServiceMock.createPrebootContract(),
  };

  return mock;
}
