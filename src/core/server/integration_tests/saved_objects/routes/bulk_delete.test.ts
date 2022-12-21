/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import supertest from 'supertest';
import { savedObjectsClientMock } from '../../../mocks';
import type { ICoreUsageStatsClient } from '@kbn/core-usage-data-base-server-internal';
import {
  coreUsageStatsClientMock,
  coreUsageDataServiceMock,
} from '@kbn/core-usage-data-server-mocks';
import { setupServer } from '@kbn/core-test-helpers-test-utils';
import {
  registerBulkDeleteRoute,
  type InternalSavedObjectsRequestHandlerContext,
} from '@kbn/core-saved-objects-server-internal';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

describe('POST /api/saved_objects/_bulk_delete', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let coreUsageStatsClient: jest.Mocked<ICoreUsageStatsClient>;

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());
    savedObjectsClient = handlerContext.savedObjects.client;

    savedObjectsClient.bulkDelete.mockResolvedValue({
      statuses: [],
    });
    const router =
      httpSetup.createRouter<InternalSavedObjectsRequestHandlerContext>('/api/saved_objects/');
    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsBulkDelete.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    registerBulkDeleteRoute(router, { coreUsageData });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('formats successful response and records usage stats', async () => {
    const clientResponse = {
      statuses: [
        {
          id: 'abc123',
          type: 'index-pattern',
          success: true,
        },
      ],
    };
    savedObjectsClient.bulkDelete.mockImplementation(() => Promise.resolve(clientResponse));

    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_delete')
      .send([
        {
          id: 'abc123',
          type: 'index-pattern',
        },
      ])
      .expect(200);

    expect(result.body).toEqual(clientResponse);
    expect(coreUsageStatsClient.incrementSavedObjectsBulkDelete).toHaveBeenCalledWith({
      request: expect.anything(),
    });
  });

  it('calls upon savedObjectClient.bulkDelete with query options', async () => {
    const docs = [
      {
        id: 'abc123',
        type: 'index-pattern',
      },
    ];

    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_delete')
      .send(docs)
      .query({ force: true })
      .expect(200);

    expect(savedObjectsClient.bulkDelete).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkDelete).toHaveBeenCalledWith(docs, { force: true });
  });
});
