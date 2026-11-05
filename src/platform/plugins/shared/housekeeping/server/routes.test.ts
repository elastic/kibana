/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { HOUSEKEEPING_FINDINGS_API_PATH, HOUSEKEEPING_RESOURCE_API_PATH } from '../common';
import { HousekeepingRegistry } from './registry';
import { registerRoutes } from './routes';
import { runHousekeeping } from './run';
import { pipelinesProvider } from './test_helpers';
import type { HousekeepingResourceTypeDefinition } from './types';

jest.mock('./run', () => ({ runHousekeeping: jest.fn() }));

const setup = (describe?: HousekeepingResourceTypeDefinition['describe']) => {
  const registry = new HousekeepingRegistry();
  registry.registerResourceProvider(
    pipelinesProvider({
      resourceTypes: [{ id: 'pipeline', label: 'Pipeline', describe }],
    })
  );
  const router = httpServiceMock.createRouter();
  registerRoutes({
    router,
    registry,
    logger: loggingSystemMock.createLogger(),
    isServerless: false,
  });

  const getHandler = (path: string) => {
    const route = router.get.mock.calls.find(([config]) => config.path === path);
    if (!route) {
      throw new Error(`No route for [${path}]`);
    }
    return route[1];
  };
  const context = coreMock.createCustomRequestHandlerContext({
    core: coreMock.createRequestHandlerContext(),
  });
  return { getHandler, context };
};

describe('findings route', () => {
  beforeEach(() => {
    jest.mocked(runHousekeeping).mockResolvedValue({
      kinds: [],
      groups: [],
      summary: { broken_reference: 0, deprecation: 0, risk: 0, unused: 0 },
      skipped: [],
      resourceTypes: {},
    });
  });

  it.each([
    ['one resource type', { resourceType: 'index' }, ['index']],
    ['several resource types', { resourceType: ['index', 'pipeline'] }, ['index', 'pipeline']],
    ['no resource type', {}, undefined],
  ])('scopes the run to %s', async (_name, query, resourceTypes) => {
    const { getHandler, context } = setup();
    const response = httpServerMock.createResponseFactory();

    await getHandler(HOUSEKEEPING_FINDINGS_API_PATH)(
      context,
      httpServerMock.createKibanaRequest({ query: { ...query, resourceId: 'logs' } }),
      response
    );

    expect(runHousekeeping).toHaveBeenCalledWith(
      expect.objectContaining({ scope: { resourceTypes, resourceId: 'logs' } })
    );
    expect(response.ok).toHaveBeenCalled();
  });
});

describe('resource route', () => {
  const request = httpServerMock.createKibanaRequest({ params: { type: 'pipeline', id: 'logs' } });
  const resourcePath = `${HOUSEKEEPING_RESOURCE_API_PATH}/{type}/{id}`;

  it('returns the definition from the describe of the type', async () => {
    const { getHandler, context } = setup(async (id) => ({ id }));
    const response = httpServerMock.createResponseFactory();

    await getHandler(resourcePath)(context, request, response);

    expect(response.ok).toHaveBeenCalledWith({ body: { definition: { id: 'logs' } } });
  });

  it('returns not found when the type has no describe', async () => {
    const { getHandler, context } = setup();
    const response = httpServerMock.createResponseFactory();

    await getHandler(resourcePath)(context, request, response);

    expect(response.notFound).toHaveBeenCalled();
  });

  it.each([
    [
      'the status of the error',
      Object.assign(new Error('Missing'), { statusCode: 404 }),
      { statusCode: 404, body: { message: 'Missing' } },
    ],
    [
      'the status of the Elasticsearch response',
      Object.assign(new Error('Forbidden'), { meta: { statusCode: 403 } }),
      { statusCode: 403, body: { message: 'Forbidden' } },
    ],
    ['500 for anything else', 'Broken', { statusCode: 500, body: { message: 'Broken' } }],
  ])('answers a failed describe with %s', async (_name, error, expected) => {
    const { getHandler, context } = setup(async () => {
      throw error;
    });
    const response = httpServerMock.createResponseFactory();

    await getHandler(resourcePath)(context, request, response);

    expect(response.customError).toHaveBeenCalledWith(expected);
  });
});
