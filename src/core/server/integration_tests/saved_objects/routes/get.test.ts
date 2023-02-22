/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import supertest from 'supertest';
import { ContextService } from '@kbn/core-http-context-server-internal';
import type { HttpService, InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import { createHttpServer, createCoreContext } from '@kbn/core-http-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import type { ICoreUsageStatsClient } from '@kbn/core-usage-data-base-server-internal';
import {
  coreUsageStatsClientMock,
  coreUsageDataServiceMock,
} from '@kbn/core-usage-data-server-mocks';
import { contextServiceMock, coreMock } from '../../../mocks';
import {
  registerGetRoute,
  type InternalSavedObjectsRequestHandlerContext,
} from '@kbn/core-saved-objects-server-internal';
import { createHiddenTypeVariants } from '@kbn/core-test-helpers-test-utils';
import { loggerMock } from '@kbn/logging-mocks';
import { setupConfig } from './routes_test_utils';

const coreId = Symbol('core');
const testTypes = [
  { name: 'index-pattern', hide: false },
  { name: 'hidden-type', hide: true },
  { name: 'hidden-from-http', hide: false, hideFromHttpApis: true },
];

describe('GET /api/saved_objects/{type}/{id}', () => {
  let server: HttpService;
  let httpSetup: InternalHttpServiceSetup;
  let handlerContext: ReturnType<typeof coreMock.createRequestHandlerContext>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let coreUsageStatsClient: jest.Mocked<ICoreUsageStatsClient>;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(async () => {
    const coreContext = createCoreContext({ coreId });
    server = createHttpServer(coreContext);
    await server.preboot({ context: contextServiceMock.createPrebootContract() });

    const contextService = new ContextService(coreContext);
    httpSetup = await server.setup({
      context: contextService.setup({ pluginDependencies: new Map() }),
      executionContext: executionContextServiceMock.createInternalSetupContract(),
    });

    handlerContext = coreMock.createRequestHandlerContext();
    handlerContext.savedObjects.typeRegistry.getType.mockImplementation((typename: string) => {
      return testTypes
        .map((typeDesc) => createHiddenTypeVariants(typeDesc))
        .find((fullTest) => fullTest.name === typename);
    });

    savedObjectsClient = handlerContext.savedObjects.client;

    httpSetup.registerRouteHandlerContext<InternalSavedObjectsRequestHandlerContext, 'core'>(
      coreId,
      'core',
      (ctx, req, res) => {
        return handlerContext;
      }
    );

    const router =
      httpSetup.createRouter<InternalSavedObjectsRequestHandlerContext>('/api/saved_objects/');

    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsGet.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);

    const logger = loggerMock.create();
    loggerWarnSpy = jest.spyOn(logger, 'warn').mockImplementation();

    const config = setupConfig();
    registerGetRoute(router, { config, coreUsageData, logger });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('formats successful response and records usage stats', async () => {
    const clientResponse = {
      id: 'logstash-*',
      title: 'logstash-*',
      type: 'logstash-type',
      attributes: {},
      timeFieldName: '@timestamp',
      notExpandable: true,
      references: [],
    };

    savedObjectsClient.get.mockResolvedValue(clientResponse);

    const result = await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/index-pattern/logstash-*')
      .expect(200);

    expect(result.body).toEqual(clientResponse);
    expect(coreUsageStatsClient.incrementSavedObjectsGet).toHaveBeenCalledWith({
      request: expect.anything(),
    });
  });

  it('calls upon savedObjectClient.get', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/index-pattern/logstash-*')
      .expect(200);

    expect(savedObjectsClient.get).toHaveBeenCalled();

    const args = savedObjectsClient.get.mock.calls[0];
    expect(args).toEqual(['index-pattern', 'logstash-*']);
  });

  it('returns with status 400 when a type is hidden from the http APIs', async () => {
    const result = await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/hidden-from-http/hiddenId')
      .expect(400);
    expect(result.body.message).toContain("Unsupported saved object type: 'hidden-from-http'");
  });

  it('logs a warning message when called', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/index-pattern/logstash-*')
      .expect(200);
    expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
  });
});
