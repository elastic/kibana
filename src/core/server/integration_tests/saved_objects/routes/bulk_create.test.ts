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
import { setupConfig } from './routes_test_utils';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

const testTypes = [
  { name: 'index-pattern', hide: false },
  { name: 'hidden-from-http', hide: false, hideFromHttpApis: true },
];

describe('POST /api/saved_objects/_bulk_create', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let coreUsageStatsClient: jest.Mocked<ICoreUsageStatsClient>;
  let loggerWarnSpy: jest.SpyInstance;

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
    loggerWarnSpy = jest.spyOn(logger, 'warn').mockImplementation();

    const config = setupConfig();

    registerBulkCreateRoute(router, { config, coreUsageData, logger });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('formats successful response and records usage stats', async () => {
    const clientResponse = {
      saved_objects: [
        {
          id: 'abc123',
          type: 'index-pattern',
          title: 'logstash-*',
          attributes: {},
          version: '2',
          references: [],
        },
      ],
    };
    savedObjectsClient.bulkCreate.mockResolvedValue(clientResponse);

    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_create')
      .send([
        {
          id: 'abc123',
          type: 'index-pattern',
          attributes: {
            title: 'my_title',
          },
        },
      ])
      .expect(200);

    expect(result.body).toEqual(clientResponse);
    expect(coreUsageStatsClient.incrementSavedObjectsBulkCreate).toHaveBeenCalledWith({
      request: expect.anything(),
    });
  });

  it('calls upon savedObjectClient.bulkCreate', async () => {
    const docs = [
      {
        id: 'abc123',
        type: 'index-pattern',
        attributes: {
          title: 'foo',
        },
        references: [],
      },
      {
        id: 'abc1234',
        type: 'index-pattern',
        attributes: {
          title: 'bar',
        },
        references: [],
      },
    ];

    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_create')
      .send(docs)
      .expect(200);

    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    const args = savedObjectsClient.bulkCreate.mock.calls[0];
    expect(args[0]).toEqual(docs);
  });

  it('passes along the overwrite option', async () => {
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
    const [[, options]] = savedObjectsClient.bulkCreate.mock.calls;
    expect(options).toEqual({ migrationVersionCompatibility: 'compatible', overwrite: true });
  });

  it('returns with status 400 when a type is hidden from the HTTP APIs', async () => {
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
      .expect(400);
    expect(result.body.message).toContain(
      'Unsupported saved object type(s): hidden-from-http: Bad Request'
    );
  });

  it('logs a warning message when called', async () => {
    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_create')
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
    expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
  });
});
