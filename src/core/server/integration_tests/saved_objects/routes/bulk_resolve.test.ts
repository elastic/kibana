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
  registerBulkResolveRoute,
  type InternalSavedObjectsRequestHandlerContext,
} from '@kbn/core-saved-objects-server-internal';
import { loggerMock } from '@kbn/logging-mocks';
import { deprecationMock, setupConfig } from './routes_test_utils';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

const testTypes = [
  { name: 'index-pattern', hide: false },
  { name: 'hidden-from-http', hide: false, hideFromHttpApis: true },
];

describe('POST /api/saved_objects/_bulk_resolve', () => {
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

    savedObjectsClient.bulkResolve.mockResolvedValue({
      resolved_objects: [],
    });

    handlerContext.savedObjects.typeRegistry.getType.mockImplementation((typename: string) => {
      return testTypes
        .map((typeDesc) => createHiddenTypeVariants(typeDesc))
        .find((fullTest) => fullTest.name === typename);
    });

    const router =
      httpSetup.createRouter<InternalSavedObjectsRequestHandlerContext>('/api/saved_objects/');
    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsBulkResolve.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    const logger = loggerMock.create();
    loggerWarnSpy = jest.spyOn(logger, 'warn').mockImplementation();
    registrationSpy = jest.spyOn(router, 'post');

    const config = setupConfig();
    const access = 'public';
    registerBulkResolveRoute(router, {
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
    const clientResponse = {
      resolved_objects: [
        {
          saved_object: {
            id: 'abc123',
            type: 'index-pattern',
            title: 'logstash-*',
            version: 'foo',
            references: [],
            attributes: {},
          },
          outcome: 'exactMatch' as const,
        },
      ],
    };
    savedObjectsClient.bulkResolve.mockImplementation(() => Promise.resolve(clientResponse));

    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_resolve')
      .set('x-elastic-internal-origin', 'kibana')
      .send([
        {
          id: 'abc123',
          type: 'index-pattern',
        },
      ])
      .expect(200);

    expect(result.body).toEqual(clientResponse);
    expect(coreUsageStatsClient.incrementSavedObjectsBulkResolve).toHaveBeenCalledWith({
      request: expect.anything(),
      types: ['index-pattern'],
    });
  });

  it('calls upon savedObjectClient.bulkResolve', async () => {
    const docs = [
      {
        id: 'abc123',
        type: 'index-pattern',
      },
    ];

    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_resolve')
      .set('x-elastic-internal-origin', 'kibana')
      .send(docs)
      .expect(200);

    expect(savedObjectsClient.bulkResolve).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkResolve).toHaveBeenCalledWith(docs, {
      migrationVersionCompatibility: 'compatible',
    });
  });

  it('returns with status 400 when a type is hidden from the HTTP APIs', async () => {
    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_resolve')
      .set('x-elastic-internal-origin', 'kibana')
      .send([
        {
          id: 'hiddenID',
          type: 'hidden-from-http',
        },
      ])
      .expect(400);
    expect(result.body.message).toContain('Unsupported saved object type(s):');
  });

  it('logs a warning message when called', async () => {
    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_resolve')
      .set('x-elastic-internal-origin', 'kibana')
      .send([
        {
          id: 'abc123',
          type: 'index-pattern',
        },
      ])
      .expect(200);
    expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
  });

  it('passes deprecation configuration to the router arguments', async () => {
    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_resolve')
      .set('x-elastic-internal-origin', 'kibana')
      .send([
        {
          id: 'abc123',
          type: 'index-pattern',
        },
      ])
      .expect(200);
    expect(registrationSpy.mock.calls[0][0]).toMatchObject({
      options: { deprecated: deprecationMock },
    });
  });
});
