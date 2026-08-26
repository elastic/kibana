/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import type { PackageInfo } from '@kbn/config';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { metricsServiceMock } from '@kbn/core-metrics-server-mocks';
import { type CoreStatus, ServiceStatusLevels } from '@kbn/core-status-common';
import type {
  CoreRequestHandlerContext,
  RequestHandlerContext,
} from '@kbn/core-http-request-handler-context-server';
import type { CoreIncrementUsageCounter } from '@kbn/core-usage-data-server';
import { registerStatusRoute } from './status';

const packageInfo: PackageInfo = {
  branch: 'master',
  buildNum: 42,
  buildSha: 'buildSha',
  buildShaShort: 'buildShaShort',
  buildDate: new Date('2023-05-15T23:12:09.000Z'),
  dist: false,
  version: '8.0.0',
  buildFlavor: 'traditional',
};

const available = {
  level: ServiceStatusLevels.available,
  summary: 'Available',
};

const core: CoreStatus = {
  elasticsearch: available,
  savedObjects: available,
};

const createHandler = ({
  incrementUsageCounter,
  statusPageBypassMonitorPrivilege = false,
}: {
  incrementUsageCounter: CoreIncrementUsageCounter;
  statusPageBypassMonitorPrivilege?: boolean;
}) => {
  const router = mockRouter.create();
  registerStatusRoute({
    router,
    logger: loggingSystemMock.createLogger(),
    config: {
      allowAnonymous: false,
      statusPageBypassMonitorPrivilege,
      packageInfo,
      serverName: 'kibana',
      uuid: 'uuid',
    },
    metrics: metricsServiceMock.createInternalSetupContract(),
    status: {
      coreOverall$: of(available),
      overall$: of(available),
      core$: of(core),
      plugins$: of({}),
    },
    incrementUsageCounter,
  });

  return (router.get as jest.Mock).mock.calls[0][1] as Function;
};

describe('registerStatusRoute', () => {
  it('increments a usage counter for unauthenticated redacted status responses', async () => {
    const incrementUsageCounter = jest.fn();
    const handler = createHandler({ incrementUsageCounter });
    const response = mockRouter.createResponseFactory();

    await handler(
      {
        core: Promise.resolve({} as CoreRequestHandlerContext),
      } as RequestHandlerContext,
      httpServerMock.createKibanaRequest({ auth: { isAuthenticated: false }, query: {} }),
      response
    );

    expect(incrementUsageCounter).toHaveBeenCalledWith({
      counterName: 'status_redacted_unauthenticated',
    });
    expect(response.custom).toHaveBeenCalledWith({
      body: {
        status: {
          overall: {
            level: 'available',
          },
        },
      },
      statusCode: 200,
      bypassErrorFormat: true,
    });
  });

  it('bypasses the monitor privilege check for authenticated status page callers', async () => {
    const incrementUsageCounter = jest.fn();
    const handler = createHandler({
      incrementUsageCounter,
      statusPageBypassMonitorPrivilege: true,
    });
    const response = mockRouter.createResponseFactory();
    const hasPrivileges = jest.fn();

    await handler(
      {
        core: Promise.resolve({
          elasticsearch: {
            client: {
              asCurrentUser: {
                security: { hasPrivileges },
              },
            },
          },
        } as unknown as CoreRequestHandlerContext),
      } as RequestHandlerContext,
      httpServerMock.createKibanaRequest({ auth: { isAuthenticated: true }, query: {} }),
      response
    );

    expect(hasPrivileges).not.toHaveBeenCalled();
    expect(incrementUsageCounter).not.toHaveBeenCalled();
    expect(response.custom).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          name: 'kibana',
        }),
      })
    );
  });
});
