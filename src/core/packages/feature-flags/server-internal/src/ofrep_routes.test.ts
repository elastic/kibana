/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './feature_flags_service.test.mocks';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { BehaviorSubject } from 'rxjs';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { configServiceMock } from '@kbn/config-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { FeatureFlagsService } from '..';
import type { FeatureFlagsConfig } from './feature_flags_config';
import { entityTag, OFREP_BULK_PATH, OFREP_SINGLE_PATH, toBulkResponse } from './ofrep_evaluation';
import { ofrepRequestBodySchema } from './ofrep_routes';

describe('OFREP routes', () => {
  const createService = (overrides: Record<string, unknown> = {}) => {
    const logger = loggerMock.create();
    const mockedConfigService = configServiceMock.create();
    mockedConfigService.atPath.mockReturnValue(
      new BehaviorSubject<FeatureFlagsConfig>({ overrides })
    );
    const http = httpServiceMock.createInternalSetupContract();
    const router = mockRouter.create();
    http.createRouter.mockReturnValue(router);
    const service = new FeatureFlagsService(
      mockCoreContext.create({
        configService: mockedConfigService,
        logger,
      })
    );
    const setup = service.setup({
      http,
      savedObjects: savedObjectsServiceMock.createInternalSetupContract(),
    });
    return { service, setup, router, logger };
  };

  const findRoute = (
    router: ReturnType<typeof mockRouter.create>,
    path: string
  ): { options: { path: string; options: { access: string } }; handler: Function } => {
    const call = (router.post as jest.Mock).mock.calls.find(([options]) => options.path === path);
    if (!call) {
      throw new Error(`Route ${path} was not registered`);
    }
    return { options: call[0], handler: call[1] };
  };

  afterEach(async () => {
    jest.clearAllMocks();
  });

  test('registers internal authenticated routes', () => {
    const { service, router } = createService();
    for (const path of [OFREP_BULK_PATH, OFREP_SINGLE_PATH]) {
      const { options } = findRoute(router, path);
      expect(options).toEqual(
        expect.objectContaining({
          path,
          options: expect.objectContaining({ access: 'internal' }),
          security: expect.objectContaining({
            authc: { enabled: true },
            authz: expect.objectContaining({ enabled: false }),
          }),
        })
      );
    }
    return service.stop();
  });

  test('accepts an OFREP context body without using it for evaluation', () => {
    expect(
      ofrepRequestBodySchema.validate({
        context: { kind: 'multi', kibana: { key: 'deployment-1', version: '9.3.0' } },
      })
    ).toEqual({
      context: { kind: 'multi', kibana: { key: 'deployment-1', version: '9.3.0' } },
    });
  });

  test('layers config overrides over the provider snapshot', async () => {
    const { service, setup, router } = createService({
      'my.flag': true,
      nested: { enabled: 'on' },
    });
    setup.setInitialFeatureFlagsGetter(async () => ({ 'my.flag': false, other: 'off' }));
    const { handler } = findRoute(router, OFREP_BULK_PATH);
    const response = mockRouter.createResponseFactory();

    await handler({}, mockRouter.createKibanaRequest({ method: 'post', body: {} }), response);

    const body = toBulkResponse({ 'my.flag': true, other: 'off', 'nested.enabled': 'on' });
    expect(response.ok).toHaveBeenCalledWith({
      body,
      headers: { etag: entityTag(body) },
    });
    await service.stop();
  });

  test('returns the server snapshot and a matching etag', async () => {
    const { service, setup, router } = createService();
    setup.setInitialFeatureFlagsGetter(async () => ({ 'my.flag': true, other: 'off' }));
    const { handler } = findRoute(router, OFREP_BULK_PATH);
    const response = mockRouter.createResponseFactory();

    await handler({}, mockRouter.createKibanaRequest({ method: 'post', body: {} }), response);

    const body = toBulkResponse({ 'my.flag': true, other: 'off' });
    expect(response.ok).toHaveBeenCalledWith({
      body,
      headers: { etag: entityTag(body) },
    });
    await service.stop();
  });

  test('returns 304 when the etag matches', async () => {
    const { service, setup, router } = createService();
    setup.setInitialFeatureFlagsGetter(async () => ({ 'my.flag': true }));
    const { handler } = findRoute(router, OFREP_BULK_PATH);
    const response = mockRouter.createResponseFactory();
    const body = toBulkResponse({ 'my.flag': true });

    await handler(
      {},
      mockRouter.createKibanaRequest({
        method: 'post',
        body: { context: { kind: 'kibana', key: 'partial' } },
        headers: { 'if-none-match': entityTag(body) },
      }),
      response
    );

    expect(response.notModified).toHaveBeenCalledWith({
      headers: { etag: entityTag(body) },
    });
    expect(response.ok).not.toHaveBeenCalled();
    await service.stop();
  });

  test('returns one flag or a not-found body', async () => {
    const { service, setup, router } = createService();
    setup.setInitialFeatureFlagsGetter(async () => ({ 'my.flag': true }));
    const { handler } = findRoute(router, OFREP_SINGLE_PATH);
    const response = mockRouter.createResponseFactory();

    await handler(
      {},
      mockRouter.createKibanaRequest({
        method: 'post',
        params: { flagKey: 'my.flag' },
        body: {},
      }),
      response
    );
    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ key: 'my.flag', value: true }),
      })
    );

    const missing = mockRouter.createResponseFactory();
    await handler(
      {},
      mockRouter.createKibanaRequest({
        method: 'post',
        params: { flagKey: 'missing' },
        body: {},
      }),
      missing
    );
    expect(missing.custom).toHaveBeenCalledWith({
      statusCode: 404,
      bypassErrorFormat: true,
      body: {
        key: 'missing',
        errorCode: 'FLAG_NOT_FOUND',
        errorDetails: "Flag 'missing' was not found.",
      },
    });
    await service.stop();
  });

  test('returns a general error when the snapshot fails', async () => {
    const { service, setup, router, logger } = createService();
    setup.setInitialFeatureFlagsGetter(async () => {
      throw new Error('launchdarkly unavailable');
    });
    const { handler } = findRoute(router, OFREP_BULK_PATH);
    const response = mockRouter.createResponseFactory();

    await handler({}, mockRouter.createKibanaRequest({ method: 'post', body: {} }), response);

    expect(response.custom).toHaveBeenCalledWith({
      statusCode: 500,
      bypassErrorFormat: true,
      body: {
        errorCode: 'GENERAL',
        errorDetails: 'Feature flag evaluation failed.',
      },
    });
    expect(logger.error).toHaveBeenCalledWith(expect.any(Error));
    await service.stop();
  });
});
