/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

jest.mock('../lib/export_dashboards', () => ({
  exportDashboards: jest.fn().mockResolvedValue({ version: 'mockversion', objects: exportObjects }),
}));

import supertest from 'supertest';
import { CoreUsageStatsClient } from '../../../../core_usage_data';
import { coreUsageStatsClientMock } from '../../../../core_usage_data/core_usage_stats_client.mock';
import { coreUsageDataServiceMock } from '../../../../core_usage_data/core_usage_data_service.mock';
import { registerLegacyExportRoute } from '../export';
import { setupServer } from '../../test_utils';
import { loggerMock } from '../../../../logging/logger.mock';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;
let coreUsageStatsClient: jest.Mocked<CoreUsageStatsClient>;

describe('POST /api/dashboards/export', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];

  beforeEach(async () => {
    ({ server, httpSetup } = await setupServer());

    const router = httpSetup.createRouter('');

    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementLegacyDashboardsExport.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    registerLegacyExportRoute(router, {
      kibanaVersion: '7.14.0',
      coreUsageData,
      logger: loggerMock.create(),
    });

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
