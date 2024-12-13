/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const exportObjects = [
  {
    id: '1',
    type: 'index-pattern',
    attributes: {},
    references: [],
  },
  {
    id: '2',
    type: 'search',
    attributes: {},
    references: [
      {
        name: 'ref_0',
        type: 'index-pattern',
        id: '1',
      },
    ],
  },
];

import supertest from 'supertest';
import type { ICoreUsageStatsClient } from '@kbn/core-usage-data-base-server-internal';
import {
  coreUsageStatsClientMock,
  coreUsageDataServiceMock,
} from '@kbn/core-usage-data-server-mocks';
import { setupServer } from '@kbn/core-test-helpers-test-utils';
import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsBulkResponse } from '@kbn/core-saved-objects-api-server';
import {
  registerLegacyExportRoute,
  type InternalSavedObjectsRequestHandlerContext,
} from '@kbn/core-saved-objects-server-internal';
import { legacyDeprecationMock } from '../routes_test_utils';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;
let coreUsageStatsClient: jest.Mocked<ICoreUsageStatsClient>;

describe('POST /api/dashboards/export', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());

    const router = httpSetup.createRouter<InternalSavedObjectsRequestHandlerContext>('');

    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementLegacyDashboardsExport.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);

    registerLegacyExportRoute(router, {
      kibanaVersion: 'mockversion',
      coreUsageData,
      logger: loggerMock.create(),
      access: 'public',
      legacyDeprecationInfo: legacyDeprecationMock,
    });

    handlerContext.savedObjects.client.bulkGet
      .mockResolvedValueOnce({
        saved_objects: exportObjects,
      } as SavedObjectsBulkResponse)
      .mockResolvedValueOnce({
        saved_objects: [],
      } as SavedObjectsBulkResponse);

    await server.start();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await server.stop();
  });

  it('calls exportDashboards and records usage stats', async () => {
    const result = await supertest(httpSetup.server.listener).get(
      '/api/kibana/dashboards/export?dashboard=942dcef0-b2cd-11e8-ad8e-85441f0c2e5c'
    );

    expect(result.status).toBe(200);
    expect(result.header['content-type']).toEqual('application/json; charset=utf-8');
    expect(result.header['content-disposition']).toMatch(
      /attachment; filename="kibana-dashboards.*\.json/
    );

    expect(result.body.objects).toEqual(exportObjects);
    expect(result.body.version).toEqual('mockversion');
    expect(coreUsageStatsClient.incrementLegacyDashboardsExport).toHaveBeenCalledWith({
      request: expect.anything(),
    });
  });
});
