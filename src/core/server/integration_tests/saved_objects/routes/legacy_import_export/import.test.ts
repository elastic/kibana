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
  registerLegacyImportRoute,
  type InternalSavedObjectsRequestHandlerContext,
} from '@kbn/core-saved-objects-server-internal';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;
let coreUsageStatsClient: jest.Mocked<ICoreUsageStatsClient>;

describe('POST /api/dashboards/import', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());

    const router = httpSetup.createRouter<InternalSavedObjectsRequestHandlerContext>('');

    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementLegacyDashboardsImport.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    registerLegacyImportRoute(router, {
      maxImportPayloadBytes: 26214400,
      coreUsageData,
      logger: loggerMock.create(),
    });

    handlerContext.savedObjects.client.bulkCreate.mockResolvedValueOnce({
      saved_objects: importObjects,
    } as SavedObjectsBulkResponse);

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
