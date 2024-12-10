/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { ICoreUsageStatsClient } from '@kbn/core-usage-data-base-server-internal';
import {
  coreUsageStatsClientMock,
  coreUsageDataServiceMock,
} from '@kbn/core-usage-data-server-mocks';
import { createHiddenTypeVariants, setupServer } from '@kbn/core-test-helpers-test-utils';
import {
  registerBulkUpdateRoute,
  type InternalSavedObjectsRequestHandlerContext,
} from '@kbn/core-saved-objects-server-internal';
import { loggerMock } from '@kbn/logging-mocks';
import { deprecationMock, setupConfig } from './routes_test_utils';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;
const testTypes = [
  { name: 'visualization', hide: false },
  { name: 'dashboard', hide: false },
  { name: 'index-pattern', hide: false },
  { name: 'hidden-from-http', hide: false, hideFromHttpApis: true },
];

describe('PUT /api/saved_objects/_bulk_update', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let coreUsageStatsClient: jest.Mocked<ICoreUsageStatsClient>;
  let loggerWarnSpy: jest.SpyInstance;
  let registrationSpy: jest.SpyInstance;

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());

    savedObjectsClient = handlerContext.savedObjects.client;

    handlerContext.savedObjects.typeRegistry.getType.mockImplementation((typename: string) => {
      return testTypes
        .map((typeDesc) => createHiddenTypeVariants(typeDesc))
        .find((fullTest) => fullTest.name === typename);
    });

    const router =
      httpSetup.createRouter<InternalSavedObjectsRequestHandlerContext>('/api/saved_objects/');
    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsBulkUpdate.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    const logger = loggerMock.create();
    loggerWarnSpy = jest.spyOn(logger, 'warn').mockImplementation();
    registrationSpy = jest.spyOn(router, 'put');

    const config = setupConfig();
    const access = 'public';

    registerBulkUpdateRoute(router, {
      config,
      coreUsageData,
      logger,
      access,
      deprecationInfo: deprecationMock,
    });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('formats successful response and records usage stats', async () => {
    const time = Date.now().toLocaleString();
    const clientResponse = [
      {
        type: 'visualization',
        id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
        updated_at: time,
        version: 'version',
        references: undefined,
        attributes: {
          title: 'An existing visualization',
        },
      },
      {
        type: 'dashboard',
        id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
        updated_at: time,
        version: 'version',
        references: undefined,
        attributes: {
          title: 'An existing dashboard',
        },
      },
    ];
    savedObjectsClient.bulkUpdate.mockResolvedValue({ saved_objects: clientResponse });

    const result = await supertest(httpSetup.server.listener)
      .put('/api/saved_objects/_bulk_update')
      .send([
        {
          type: 'visualization',
          id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
          attributes: {
            title: 'An existing visualization',
          },
        },
        {
          type: 'dashboard',
          id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
          attributes: {
            title: 'An existing dashboard',
          },
        },
      ])
      .expect(200);

    expect(result.body).toEqual({ saved_objects: clientResponse });
    expect(coreUsageStatsClient.incrementSavedObjectsBulkUpdate).toHaveBeenCalledWith({
      request: expect.anything(),
      types: ['visualization', 'dashboard'],
    });
  });

  it('calls upon savedObjectClient.bulkUpdate', async () => {
    savedObjectsClient.bulkUpdate.mockResolvedValue({ saved_objects: [] });

    await supertest(httpSetup.server.listener)
      .put('/api/saved_objects/_bulk_update')
      .send([
        {
          type: 'visualization',
          id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
          attributes: {
            title: 'An existing visualization',
          },
        },
        {
          type: 'dashboard',
          id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
          attributes: {
            title: 'An existing dashboard',
          },
        },
      ])
      .expect(200);

    expect(savedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkUpdate).toHaveBeenCalledWith([
      {
        type: 'visualization',
        id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
        attributes: {
          title: 'An existing visualization',
        },
      },
      {
        type: 'dashboard',
        id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
        attributes: {
          title: 'An existing dashboard',
        },
      },
    ]);
  });

  it('returns with status 400 when a type is hidden from the HTTP APIs', async () => {
    const result = await supertest(httpSetup.server.listener)
      .put('/api/saved_objects/_bulk_update')
      .send([
        {
          type: 'hidden-from-http',
          id: 'hiddenID',
          attributes: {
            title: 'bar',
          },
        },
      ])
      .expect(400);

    expect(result.body.message).toContain('Unsupported saved object type(s):');
  });

  it('logs a warning message when called', async () => {
    await supertest(httpSetup.server.listener)
      .put('/api/saved_objects/_bulk_update')
      .send([
        {
          type: 'visualization',
          id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
          attributes: {
            title: 'An existing visualization',
          },
        },
        {
          type: 'dashboard',
          id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
          attributes: {
            title: 'An existing dashboard',
          },
        },
      ])
      .expect(200);
    expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
    expect(registrationSpy.mock.calls[0][0]).toMatchObject({
      options: { deprecated: deprecationMock },
    });
  });

  it('passes deprecation configuration to the router arguments', async () => {
    await supertest(httpSetup.server.listener)
      .put('/api/saved_objects/_bulk_update')
      .set('x-elastic-internal-origin', 'kibana')
      .send([
        {
          type: 'visualization',
          id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
          attributes: {
            title: 'An existing visualization',
          },
        },
        {
          type: 'dashboard',
          id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
          attributes: {
            title: 'An existing dashboard',
          },
        },
      ])
      .expect(200);

    expect(registrationSpy.mock.calls[0][0]).toMatchObject({
      options: { deprecated: deprecationMock },
    });
  });
});
