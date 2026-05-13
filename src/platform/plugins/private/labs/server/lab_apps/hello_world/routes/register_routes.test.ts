/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockRouter as router } from '@kbn/core-http-router-server-mocks';
import { httpResourcesMock, httpServerMock } from '@kbn/core/server/mocks';
import { HELLO_WORLD_API_PATH } from '../../../../common';
import { registerHelloWorldRoutes } from './register_routes';
import { isLabInstalled } from '../../../lib/installed_labs';

jest.mock('../../../lib/installed_labs', () => ({
  isLabInstalled: jest.fn(),
}));

describe('registerHelloWorldRoutes', () => {
  const mockRouter = router.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the hello world route', () => {
    registerHelloWorldRoutes(mockRouter);

    expect(mockRouter.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: HELLO_WORLD_API_PATH,
        options: {
          access: 'internal',
        },
        security: {
          authz: {
            enabled: false,
            reason: 'Labs installs are enforced per user inside the route handler.',
          },
        },
        validate: false,
      }),
      expect.any(Function)
    );
  });

  it('returns forbidden when the lab is not installed', async () => {
    (isLabInstalled as jest.Mock).mockResolvedValue(false);
    const request = httpServerMock.createKibanaRequest();
    const response = httpResourcesMock.createResponseFactory();

    registerHelloWorldRoutes(mockRouter);

    const routeHandler = mockRouter.get.mock.calls[0][1];
    await routeHandler({}, request, response);

    expect(response.forbidden).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: 'Install the Hello world lab before using this API.',
        }),
      })
    );
  });

  it('returns the hello world payload when the lab is installed', async () => {
    (isLabInstalled as jest.Mock).mockResolvedValue(true);
    const request = httpServerMock.createKibanaRequest();
    const response = httpResourcesMock.createResponseFactory();

    registerHelloWorldRoutes(mockRouter);

    const routeHandler = mockRouter.get.mock.calls[0][1];
    await routeHandler({}, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        message: 'Hello from the Labs server route.',
      },
    });
  });
});
