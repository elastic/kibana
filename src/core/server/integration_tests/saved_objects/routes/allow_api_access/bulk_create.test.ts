/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import supertest from 'supertest';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { ICoreUsageStatsClient } from '@kbn/core-usage-data-base-server-internal';
import {
  coreUsageStatsClientMock,
  coreUsageDataServiceMock,
} from '@kbn/core-usage-data-server-mocks';

import {
  registerBulkCreateRoute,
  type InternalSavedObjectsRequestHandlerContext,
} from '@kbn/core-saved-objects-server-internal';
import { createHiddenTypeVariants, setupServer } from '@kbn/core-test-helpers-test-utils';
import { loggerMock } from '@kbn/logging-mocks';
import { setupConfig } from '../routes_test_utils';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

const testTypes = [
  { name: 'index-pattern', hide: false },
  { name: 'hidden-from-http', hide: false, hideFromHttpApis: true },
];

describe('POST /api/saved_objects/_bulk_create with allowApiAccess true', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let coreUsageStatsClient: jest.Mocked<ICoreUsageStatsClient>;

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());
    savedObjectsClient = handlerContext.savedObjects.client;
    savedObjectsClient.bulkCreate.mockResolvedValue({ saved_objects: [] });

    handlerContext.savedObjects.typeRegistry.getType.mockImplementation((typename: string) => {
      return testTypes
        .map((typeDesc) => createHiddenTypeVariants(typeDesc))
        .find((fullTest) => fullTest.name === typename);
    });

    const router =
      httpSetup.createRouter<InternalSavedObjectsRequestHandlerContext>('/api/saved_objects/');
    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsBulkCreate.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    const logger = loggerMock.create();
    const config = setupConfig(true);
    registerBulkCreateRoute(router, { config, coreUsageData, logger });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('returns with status 200 when a type is hidden from the HTTP APIs', async () => {
    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_create?overwrite=true')
      .send([
        {
          id: 'abc1234',
          type: 'index-pattern',
          attributes: {
            title: 'foo',
          },
          references: [],
        },
      ])
      .expect(200);

    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkCreate).nthCalledWith(1, expect.anything(), {
      migrationVersionCompatibility: 'compatible',
      overwrite: true,
    });
    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_create')
      .send([
        {
          id: 'hiddenID',
          type: 'hidden-from-http',
          attributes: {
            title: 'bar',
          },
          references: [],
        },
      ])
      .expect(200);
    expect(result.body.saved_objects).toEqual([]);
  });
});
