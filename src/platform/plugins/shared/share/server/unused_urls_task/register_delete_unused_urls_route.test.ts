/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { KibanaRequest, ReservedPrivilegesSet } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { coreMock, httpResourcesMock } from '@kbn/core/server/mocks';
import { mockRouter as router } from '@kbn/core-http-router-server-mocks';
import { registerDeleteUnusedUrlsRoute } from './register_delete_unused_urls_route';
import { runDeleteUnusedUrlsTask } from './task';

jest.mock('./task', () => ({
  runDeleteUnusedUrlsTask: jest.fn(),
}));

describe('registerDeleteUnusedUrlsRoute', () => {
  const mockRouter = router.create();
  const mockCoreSetup = coreMock.createSetup();
  const mockUrlExpirationDuration = moment.duration(1, 'year');
  const mockMaxPageSize = 1000;
  const mockLogger = loggingSystemMock.create().get();
  const mockResponseFactory = httpResourcesMock.createResponseFactory();

  it('registers the POST route with correct path and options', () => {
    registerDeleteUnusedUrlsRoute({
      router: mockRouter,
      core: mockCoreSetup,
      urlExpirationDuration: mockUrlExpirationDuration,
      maxPageSize: mockMaxPageSize,
      logger: mockLogger,
    });

    expect(mockRouter.post).toHaveBeenCalledTimes(1);
    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/internal/unused_urls_cleanup/run',
        security: {
          authz: {
            requiredPrivileges: [ReservedPrivilegesSet.superuser],
          },
        },
        options: {
          access: 'internal',
          summary: 'Runs the unused URLs cleanup task',
        },
        validate: {},
      }),
      expect.any(Function)
    );
  });

  it('route handler calls runDeleteUnusedUrlsTask and returns success response', async () => {
    registerDeleteUnusedUrlsRoute({
      router: mockRouter,
      core: mockCoreSetup,
      urlExpirationDuration: mockUrlExpirationDuration,
      maxPageSize: mockMaxPageSize,
      logger: mockLogger,
    });

    const routeHandler = mockRouter.post.mock.calls[0][1];
    const mockRequest = {} as KibanaRequest;
    const mockContext = {} as any;

    await routeHandler(mockContext, mockRequest, mockResponseFactory);

    expect(runDeleteUnusedUrlsTask).toHaveBeenCalledTimes(1);
    expect(runDeleteUnusedUrlsTask).toHaveBeenCalledWith({
      core: mockCoreSetup,
      urlExpirationDuration: mockUrlExpirationDuration,
      maxPageSize: mockMaxPageSize,
      logger: mockLogger,
    });

    expect(mockResponseFactory.ok).toHaveBeenCalledTimes(1);
    expect(mockResponseFactory.ok).toHaveBeenCalledWith({
      body: {
        message: 'Unused URLs cleanup task has finished.',
      },
    });
  });
});
