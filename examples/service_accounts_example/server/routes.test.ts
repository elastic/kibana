/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { RequestHandler, RouteConfig } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';

import {
  CREATE_PATH,
  JOB_ATTACH_PATH,
  JOB_DETACH_PATH,
  JOB_RUN_PATH,
  JOBS_PATH,
  WORKLOAD_TYPE,
} from '../common/constants';
import { registerRoutes } from './routes';
import type { SaExampleJobAttributes } from './saved_object';

const JOB_ID = 'job-1';
const SERVICE_ACCOUNT_ID = 'sa-1';

const jobAttributes: SaExampleJobAttributes = {
  title: 'Nightly report',
  description: 'example',
};

const binding = {
  operationType: 'sa_example',
  workloadType: WORKLOAD_TYPE,
  workloadId: JOB_ID,
  serviceAccountId: SERVICE_ACCOUNT_ID,
  spaceId: 'default',
  attachedBy: { type: 'user' as const, username: 'elastic' },
  attachedAt: '2026-08-21T00:00:00.000Z',
};

describe('example job routes', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const coreStart = coreMock.createStart();
    const soClient = coreMock.createRequestHandlerContext().savedObjects.client;
    const operationHandle = {
      attach: jest.fn().mockResolvedValue(binding),
      detach: jest.fn().mockResolvedValue(undefined),
      getBinding: jest.fn().mockResolvedValue(null),
      withScopedRequest: jest.fn(),
    };
    const logger = loggingSystemMock.createLogger();

    soClient.get.mockResolvedValue({
      id: JOB_ID,
      type: 'sa_example_job',
      attributes: jobAttributes,
      references: [],
    });
    soClient.find.mockResolvedValue({
      saved_objects: [
        {
          id: JOB_ID,
          type: 'sa_example_job',
          attributes: jobAttributes,
          references: [],
          score: 1,
        },
      ],
      total: 1,
      per_page: 100,
      page: 1,
    });
    soClient.create.mockResolvedValue({
      id: JOB_ID,
      type: 'sa_example_job',
      attributes: jobAttributes,
      references: [],
    });
    soClient.update.mockResolvedValue({
      id: JOB_ID,
      type: 'sa_example_job',
      attributes: { lastRun: { at: '2026-08-21T00:00:00.000Z' } },
      references: [],
    });

    coreStart.security.authc.getCurrentUser = jest.fn().mockReturnValue({
      username: 'elastic',
      roles: ['superuser'],
    }) as typeof coreStart.security.authc.getCurrentUser;
    coreStart.elasticsearch.client.asScoped = jest.fn().mockReturnValue({
      asCurrentUser: {
        security: {
          authenticate: jest.fn().mockResolvedValue({ username: 'sa-user', roles: ['sa'] }),
        },
      },
    }) as typeof coreStart.elasticsearch.client.asScoped;

    registerRoutes({
      router,
      getStartServices: jest.fn().mockResolvedValue([coreStart, {}, {}]),
      operationHandle,
      logger,
      getSpaceId: () => 'default',
    });

    const context = coreMock.createCustomRequestHandlerContext({
      core: { savedObjects: { client: soClient } },
    });

    const handlerFor = (method: 'get' | 'post' | 'delete', path: string) => {
      const match = router[method].mock.calls.find(([{ path: registered }]) => registered === path);
      if (!match) {
        throw new Error(`No ${method.toUpperCase()} ${path} route`);
      }
      return {
        config: match[0] as RouteConfig<any, any, any, typeof method>,
        handler: match[1] as RequestHandler<any, any, any, any>,
      };
    };

    return { router, soClient, operationHandle, context, handlerFor, coreStart };
  };

  const call = (
    handler: RequestHandler<any, any, any, any>,
    context: ReturnType<typeof coreMock.createCustomRequestHandlerContext>,
    request = httpServerMock.createKibanaRequest()
  ) => handler(context, request, kibanaResponseFactory);

  it('lists jobs and merges getBinding onto each', async () => {
    const { handlerFor, context, operationHandle } = setup();
    operationHandle.getBinding.mockResolvedValue(binding);
    const { handler } = handlerFor('get', JOBS_PATH);

    const response = await call(handler, context);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      jobs: [
        expect.objectContaining({
          id: JOB_ID,
          title: 'Nightly report',
          binding: expect.objectContaining({ serviceAccountId: SERVICE_ACCOUNT_ID }),
        }),
      ],
    });
    expect(operationHandle.getBinding).toHaveBeenCalledWith({
      workloadType: WORKLOAD_TYPE,
      workloadId: JOB_ID,
      spaceId: 'default',
    });
  });

  it('attaches using the job id as the workload id', async () => {
    const { handlerFor, context, operationHandle } = setup();
    operationHandle.getBinding.mockResolvedValue(binding);
    const { handler } = handlerFor('post', JOB_ATTACH_PATH);

    const response = await call(
      handler,
      context,
      httpServerMock.createKibanaRequest({
        params: { id: JOB_ID },
        body: { serviceAccountId: SERVICE_ACCOUNT_ID },
      })
    );

    expect(response.status).toBe(200);
    expect(operationHandle.attach).toHaveBeenCalledWith(expect.anything(), {
      serviceAccountId: SERVICE_ACCOUNT_ID,
      workloadType: WORKLOAD_TYPE,
      workloadId: JOB_ID,
    });
    expect(response.payload.job.binding.serviceAccountId).toBe(SERVICE_ACCOUNT_ID);
  });

  it('detaches using the job id as the workload id', async () => {
    const { handlerFor, context, operationHandle } = setup();
    const { handler } = handlerFor('post', JOB_DETACH_PATH);

    const response = await call(
      handler,
      context,
      httpServerMock.createKibanaRequest({ params: { id: JOB_ID } })
    );

    expect(response.status).toBe(200);
    expect(operationHandle.detach).toHaveBeenCalledWith(expect.anything(), {
      workloadType: WORKLOAD_TYPE,
      workloadId: JOB_ID,
    });
  });

  it('runs withScopedRequest, persists lastRun, and never returns tokens', async () => {
    const { handlerFor, context, operationHandle, soClient } = setup();
    operationHandle.getBinding.mockResolvedValue(binding);
    operationHandle.withScopedRequest.mockImplementation(async (_coords, fn) =>
      fn(httpServerMock.createFakeKibanaRequest({ headers: {} }))
    );

    const { handler } = handlerFor('post', JOB_RUN_PATH);
    const response = await call(
      handler,
      context,
      httpServerMock.createKibanaRequest({ params: { id: JOB_ID } })
    );

    expect(response.status).toBe(200);
    expect(soClient.update).toHaveBeenCalledWith(
      'sa_example_job',
      JOB_ID,
      expect.objectContaining({
        lastRun: expect.objectContaining({
          scoped: expect.objectContaining({
            esAuthenticate: { username: 'sa-user', roles: ['sa'] },
          }),
        }),
      })
    );
    expect(response.payload.job.lastRun).not.toHaveProperty('loopback');

    const serialized = JSON.stringify(response.payload);
    expect(serialized).not.toMatch(/essu_/);
    expect(serialized).not.toMatch(/Bearer /);
    expect(serialized).not.toMatch(/secret-token/);
  });

  it('does not persist a serviceAccountId on the job document', async () => {
    const { handlerFor, context, soClient } = setup();
    const { handler } = handlerFor('post', JOBS_PATH);

    await call(
      handler,
      context,
      httpServerMock.createKibanaRequest({
        body: { title: 'Nightly report', description: 'example' },
      })
    );

    expect(soClient.create).toHaveBeenCalledWith(
      'sa_example_job',
      expect.not.objectContaining({ serviceAccountId: expect.anything() })
    );
  });

  it('creates a service account with only a name', async () => {
    const { handlerFor, context, coreStart } = setup();
    const created = {
      id: SERVICE_ACCOUNT_ID,
      type: 'project' as const,
      name: 'example-service-account',
      organization_id: 'org-1',
      role_assignments: { limit: { access: ['application'], resource: ['project'] } },
      assumable_by: [],
    };
    coreStart.security.serviceAccounts.create.mockResolvedValue(created);
    const { handler } = handlerFor('post', CREATE_PATH);

    const response = await call(
      handler,
      context,
      httpServerMock.createKibanaRequest({
        body: { name: 'example-service-account' },
      })
    );

    expect(response.status).toBe(200);
    expect(coreStart.security.serviceAccounts.create).toHaveBeenCalledWith(expect.anything(), {
      name: 'example-service-account',
    });
    expect(response.payload).toEqual({
      via: 'core.security.serviceAccounts.create',
      account: created,
    });
  });

  it('returns the Core error when attach is refused', async () => {
    const { handlerFor, context, operationHandle } = setup();
    operationHandle.attach.mockRejectedValue(
      Boom.forbidden(
        'Cannot attach a service account to a workload: missing `manage_security` cluster privilege'
      )
    );
    const { handler } = handlerFor('post', JOB_ATTACH_PATH);

    const response = await call(
      handler,
      context,
      httpServerMock.createKibanaRequest({
        params: { id: JOB_ID },
        body: { serviceAccountId: SERVICE_ACCOUNT_ID },
      })
    );

    expect(response.status).toBe(403);
    expect(response.payload.message).toContain('manage_security');
  });
});
