/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';
import { ContextService } from '@kbn/core-http-context-server-internal';
import type { HttpService, InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import { createCoreContext } from '@kbn/core-http-server-mocks';
import type { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { ICoreUsageStatsClient } from '@kbn/core-usage-data-base-server-internal';
import {
  coreUsageStatsClientMock,
  coreUsageDataServiceMock,
} from '@kbn/core-usage-data-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { userActivityServiceMock } from '@kbn/core-user-activity-server-mocks';
import {
  registerResolveRoute,
  type InternalSavedObjectsRequestHandlerContext,
} from '@kbn/core-saved-objects-server-internal';
import { createHiddenTypeVariants } from '@kbn/core-test-helpers-test-utils';
import { loggerMock } from '@kbn/logging-mocks';
import { deprecationMock, setupConfig } from './routes_test_utils';
import { contextServiceMock, coreMock } from '../../../mocks';
import { createInternalHttpService } from '../../utilities';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';

const coreId = Symbol('core');

const testTypes = [
  { name: 'index-pattern', hide: false },
  { name: 'hidden-type', hide: true },
  { name: 'hidden-from-http', hide: false, hideFromHttpApis: true },
];

describe('GET /api/saved_objects/resolve/{type}/{id}', () => {
  let server: HttpService;
  let httpSetup: InternalHttpServiceSetup;
  let handlerContext: ReturnType<typeof coreMock.createRequestHandlerContext>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let coreUsageStatsClient: jest.Mocked<ICoreUsageStatsClient>;
  let loggerWarnSpy: jest.SpyInstance;
  let registrationSpy: jest.SpyInstance;

  beforeEach(async () => {
    const coreContext = createCoreContext({ coreId });
    server = createInternalHttpService(coreContext);
    await server.preboot({
      context: contextServiceMock.createPrebootContract(),
      docLinks: docLinksServiceMock.createSetupContract(),
    });

    const contextService = new ContextService(coreContext);
    httpSetup = await server.setup({
      context: contextService.setup({ pluginDependencies: new Map() }),
      executionContext: executionContextServiceMock.createInternalSetupContract(),
      userActivity: userActivityServiceMock.createInternalSetupContract(),
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
    coreUsageStatsClient.incrementSavedObjectsResolve.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    const logger = loggerMock.create();
    loggerWarnSpy = jest.spyOn(logger, 'warn').mockImplementation();
    registrationSpy = jest.spyOn(router, 'get');

    const config = setupConfig();
    const access = 'public';

    registerResolveRoute(router, {
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

  it('formats successful response', async () => {
    const clientResponse = {
      saved_object: {
        id: 'logstash-*',
        title: 'logstash-*',
        type: 'logstash-type',
        attributes: {},
        timeFieldName: '@timestamp',
        notExpandable: true,
        references: [],
      },
      outcome: 'exactMatch' as 'exactMatch',
    };

    savedObjectsClient.resolve.mockResolvedValue(clientResponse);

    const result = await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/resolve/index-pattern/logstash-*')
      .set('x-elastic-internal-origin', 'kibana')
      .expect(200);

    expect(result.body).toEqual(clientResponse);
  });

  it('calls upon savedObjectClient.resolve', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/resolve/index-pattern/logstash-*')
      .set('x-elastic-internal-origin', 'kibana')
      .expect(200);

    expect(savedObjectsClient.resolve).toHaveBeenCalled();
    expect(savedObjectsClient.resolve).nthCalledWith(1, 'index-pattern', 'logstash-*', {
      migrationVersionCompatibility: 'compatible',
    });
  });

  it('returns with status 400 is a type is hidden from the HTTP APIs', async () => {
    const result = await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/resolve/hidden-from-http/hiddenId')
      .set('x-elastic-internal-origin', 'kibana')
      .expect(400);
    expect(result.body.message).toContain("Unsupported saved object type: 'hidden-from-http'");
  });

  it('logs a warning message when called', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/resolve/index-pattern/logstash-*')
      .set('x-elastic-internal-origin', 'kibana')
      .expect(200);
    expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
  });

  it('passes deprecation configuration to the router arguments', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/resolve/index-pattern/logstash-*')
      .set('x-elastic-internal-origin', 'kibana')
      .expect(200);
    expect(registrationSpy.mock.calls[0][0]).toMatchObject({
      options: { deprecated: deprecationMock },
    });
  });
});
