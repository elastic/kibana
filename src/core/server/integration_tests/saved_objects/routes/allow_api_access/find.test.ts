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
import { createHiddenTypeVariants, setupServer } from '@kbn/core-test-helpers-test-utils';
import { loggerMock } from '@kbn/logging-mocks';
import {
  registerFindRoute,
  type InternalSavedObjectsRequestHandlerContext,
} from '@kbn/core-saved-objects-server-internal';
import { setupConfig } from '../routes_test_utils';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

const testTypes = [
  { name: 'index-pattern', hide: false },
  { name: 'visualization', hide: false },
  { name: 'dashboard', hide: false },
  { name: 'foo', hide: false },
  { name: 'bar', hide: false },
  { name: 'hidden-type', hide: true },
  { name: 'hidden-from-http', hide: false, hideFromHttpApis: true },
];
describe('GET /api/saved_objects/_find with allowApiAccess true', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let coreUsageStatsClient: jest.Mocked<ICoreUsageStatsClient>;

  const clientResponse = {
    total: 0,
    saved_objects: [],
    per_page: 0,
    page: 0,
  };

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());

    handlerContext.savedObjects.typeRegistry.getType.mockImplementation((typename: string) => {
      return testTypes
        .map((typeDesc) => createHiddenTypeVariants(typeDesc))
        .find((fullTest) => fullTest.name === typename);
    });

    savedObjectsClient = handlerContext.savedObjects.client;

    savedObjectsClient.find.mockResolvedValue(clientResponse);

    const router =
      httpSetup.createRouter<InternalSavedObjectsRequestHandlerContext>('/api/saved_objects/');
    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsFind.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);

    const logger = loggerMock.create();

    const config = setupConfig(true);
    const access = 'public';

    registerFindRoute(router, { config, coreUsageData, logger, access });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('returns with status 400 when type is hidden from the HTTP APIs', async () => {
    const findResponse = {
      total: 0,
      per_page: 0,
      page: 0,
      saved_objects: [],
    };
    const result = await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=hidden-from-http')
      .expect(200);

    expect(result.body).toEqual(findResponse);
  });

  it('returns with status 200 when type is hidden', async () => {
    const findResponse = {
      total: 0,
      per_page: 0,
      page: 0,
      saved_objects: [],
    };
    const result = await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=hidden-type')
      .expect(200);

    expect(result.body).toEqual(findResponse);
  });
});
