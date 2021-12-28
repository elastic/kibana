/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const importObjects = [
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

jest.mock('../lib/import_dashboards', () => ({
  importDashboards: jest.fn().mockResolvedValue({ objects: importObjects }),
}));

import supertest from 'supertest';
import { CoreUsageStatsClient } from '../../../../core_usage_data';
import { coreUsageStatsClientMock } from '../../../../core_usage_data/core_usage_stats_client.mock';
import { coreUsageDataServiceMock } from '../../../../core_usage_data/core_usage_data_service.mock';
import { registerLegacyImportRoute } from '../import';
import { setupServer } from '../../test_utils';
import { loggerMock } from 'src/core/server/logging/logger.mock';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;
let coreUsageStatsClient: jest.Mocked<CoreUsageStatsClient>;

describe('POST /api/dashboards/import', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];

  beforeEach(async () => {
    ({ server, httpSetup } = await setupServer());

    const router = httpSetup.createRouter('');

    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementLegacyDashboardsImport.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    registerLegacyImportRoute(router, {
      maxImportPayloadBytes: 26214400,
      coreUsageData,
      logger: loggerMock.create(),
    });

    await server.start();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await server.stop();
  });

  it('calls importDashboards and records usage stats', async () => {
    const result = await supertest(httpSetup.server.listener)
      .post('/api/kibana/dashboards/import')
      .send({ version: '7.14.0', objects: importObjects });

    expect(result.status).toBe(200);

    expect(result.body.objects).toEqual(importObjects);
    expect(coreUsageStatsClient.incrementLegacyDashboardsImport).toHaveBeenCalledWith({
      request: expect.anything(),
    });
  });
});
