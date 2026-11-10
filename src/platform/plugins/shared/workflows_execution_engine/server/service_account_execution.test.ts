/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  securityServiceMock,
} from '@kbn/core/server/mocks';
import { hasWorkflowAccess } from './lib/has_workflow_access';
import {
  ensureWorkflowCallerAvailable,
  getServiceAccountCallerTaskRunAs,
  getWorkflowOriginalRequest,
  getWorkflowTaskRunAs,
  isPermanentMintFailure,
  withWorkflowBindingRequest,
  withWorkflowExecutionIdentity,
  withWorkflowTaskRunAs,
} from './service_account_execution';

const tokenExchangeError = (retryable: boolean) =>
  Object.assign(new Error('token exchange failed'), {
    name: 'ServiceAccountTokenExchangeError',
    retryable,
  });

describe('workflow service account execution', () => {
  const execution = (accountId?: string) => ({
    id: 'parent-execution',
    workflowId: 'workflow',
    spaceId: 'space',
    workflowDefinition: {
      version: '1' as const,
      name: 'Workflow',
      enabled: true,
      triggers: [{ type: 'manual' as const }],
      steps: [],
      ...(accountId ? { settings: { run_as: accountId } } : {}),
    },
  });

  it('keeps the original request for an ordinary workflow', async () => {
    const core = {
      ...coreMock.createStart(),
      security: securityServiceMock.createStart(),
      elasticsearch: elasticsearchServiceMock.createStart(),
    };
    const request = httpServerMock.createKibanaRequest();
    const run = jest.fn().mockResolvedValue('done');
    await expect(withWorkflowExecutionIdentity(core, execution(), request, run)).resolves.toBe(
      'done'
    );
    expect(run).toHaveBeenCalledWith(request);
    expect(core.security.serviceAccounts.withScopedRequestForWorkload).not.toHaveBeenCalled();
  });

  it('pins the account in the mint call and keeps child caller context separate', async () => {
    const core = {
      ...coreMock.createStart(),
      security: securityServiceMock.createStart(),
      elasticsearch: elasticsearchServiceMock.createStart(),
    };
    core.security.serviceAccounts.isEnabled.mockReturnValue(true);
    const request = httpServerMock.createKibanaRequest();
    const scoped = httpServerMock.createKibanaRequest();
    core.security.serviceAccounts.withScopedRequestForWorkload.mockImplementation(
      async (params, fn) => fn(scoped)
    );
    const child = jest.fn().mockResolvedValue('child');
    await withWorkflowExecutionIdentity(core, execution('account-a'), request, async (actual) => {
      expect(actual).toBe(scoped);
      expect(getWorkflowOriginalRequest(actual)).toBe(request);
      await withWorkflowExecutionIdentity(core, execution(), actual, child);
    });
    expect(child).toHaveBeenCalledWith(request);
    expect(core.security.serviceAccounts.withScopedRequestForWorkload).toHaveBeenCalledWith(
      {
        workloadType: 'workflow',
        workloadId: 'workflow',
        spaceId: 'space',
        expectedServiceAccountId: 'account-a',
        executionId: 'parent-execution',
      },
      expect.any(Function)
    );
    expect(getWorkflowOriginalRequest(scoped)).toBe(scoped);
  });

  describe('task runAs for service account callers', () => {
    const serviceAccountPrincipal = {
      type: 'service_account' as const,
      serviceAccountId: 'agent-account',
      variant: 'uiam' as const,
    };

    it('runs a bound execution started by a service account as the workflow binding', () => {
      const core = { ...coreMock.createStart(), security: securityServiceMock.createStart() };
      const request = httpServerMock.createKibanaRequest();
      core.security.authc.getPrincipal.mockReturnValue(serviceAccountPrincipal);

      expect(getServiceAccountCallerTaskRunAs(core, request, execution('account-a'))).toEqual({
        workloadType: 'workflow',
        workloadId: 'workflow',
        spaceId: 'space',
        expectedServiceAccountId: 'account-a',
      });
      expect(core.security.authc.getPrincipal).toHaveBeenCalledWith(request);
    });

    it('runs an inherited execution as the binding it inherited', () => {
      const core = { ...coreMock.createStart(), security: securityServiceMock.createStart() };
      core.security.authc.getPrincipal.mockReturnValue(serviceAccountPrincipal);

      expect(
        getServiceAccountCallerTaskRunAs(core, httpServerMock.createKibanaRequest(), {
          ...execution(),
          effectiveIdentity: {
            type: 'service_account',
            id: 'parent-account',
            inheritedFrom: { workloadId: 'parent-workflow' },
          },
        })
      ).toEqual(
        expect.objectContaining({
          workloadId: 'parent-workflow',
          expectedServiceAccountId: 'parent-account',
        })
      );
    });

    it('keeps cloning for users and for unbound executions', () => {
      const core = { ...coreMock.createStart(), security: securityServiceMock.createStart() };
      const request = httpServerMock.createKibanaRequest();
      core.security.authc.getPrincipal.mockReturnValue({ type: 'user', username: 'elastic' });
      expect(getServiceAccountCallerTaskRunAs(core, request, execution('account-a'))).toBe(
        undefined
      );

      core.security.authc.getPrincipal.mockReturnValue(serviceAccountPrincipal);
      expect(getServiceAccountCallerTaskRunAs(core, request, execution())).toBe(undefined);
    });

    it('scopes the runAs to the request while the execution runs', async () => {
      const core = {
        ...coreMock.createStart(),
        security: securityServiceMock.createStart(),
        elasticsearch: elasticsearchServiceMock.createStart(),
      };
      core.security.serviceAccounts.isEnabled.mockReturnValue(true);
      core.security.authc.getPrincipal.mockReturnValue(serviceAccountPrincipal);
      const request = httpServerMock.createKibanaRequest();
      const scoped = httpServerMock.createKibanaRequest();
      core.security.serviceAccounts.withScopedRequestForWorkload.mockImplementation(
        async (_params, fn) => fn(scoped)
      );

      await withWorkflowExecutionIdentity(core, execution('account-a'), request, async (actual) => {
        expect(getWorkflowTaskRunAs(actual)).toEqual(
          expect.objectContaining({ expectedServiceAccountId: 'account-a' })
        );
      });
      expect(getWorkflowTaskRunAs(scoped)).toBeUndefined();
      expect(getWorkflowTaskRunAs(request)).toBeUndefined();
    });

    it('releases the runAs when the work throws', async () => {
      const request = httpServerMock.createKibanaRequest();
      const runAs = {
        workloadType: 'workflow',
        workloadId: 'workflow',
        spaceId: 'space',
        expectedServiceAccountId: 'account-a',
      };

      await expect(
        withWorkflowTaskRunAs(request, runAs, async () => {
          expect(getWorkflowTaskRunAs(request)).toBe(runAs);
          throw new Error('boom');
        })
      ).rejects.toThrow('boom');
      expect(getWorkflowTaskRunAs(request)).toBeUndefined();
    });
  });

  describe('runs resumed by Task Manager as their binding', () => {
    const bindingRunAs = {
      workloadType: 'workflow',
      workloadId: 'workflow',
      spaceId: 'space',
      expectedServiceAccountId: 'account-a',
    };
    const createCore = () => {
      const core = {
        ...coreMock.createStart(),
        security: securityServiceMock.createStart(),
        elasticsearch: elasticsearchServiceMock.createStart(),
      };
      core.security.serviceAccounts.isEnabled.mockReturnValue(true);
      return core;
    };

    it('runs the execution with the minted request instead of minting again', async () => {
      const core = createCore();
      const minted = httpServerMock.createKibanaRequest();
      const run = jest.fn().mockResolvedValue('done');

      await expect(
        withWorkflowBindingRequest(minted, 'parent-execution', bindingRunAs, () =>
          withWorkflowExecutionIdentity(core, execution('account-a'), minted, run)
        )
      ).resolves.toBe('done');
      expect(run).toHaveBeenCalledWith(minted);
      expect(core.security.serviceAccounts.withScopedRequestForWorkload).not.toHaveBeenCalled();
    });

    it('rejects an unbound execution started from the run, since it has no caller', async () => {
      const core = createCore();
      const minted = httpServerMock.createKibanaRequest();
      const child = jest.fn();

      await withWorkflowBindingRequest(minted, 'parent-execution', bindingRunAs, async () => {
        expect(() => ensureWorkflowCallerAvailable(minted, { workflowId: 'child' })).toThrow(
          'Workflow "child" has no service account'
        );
        await withWorkflowExecutionIdentity(
          core,
          execution('account-a'),
          minted,
          async (actual) => {
            await expect(
              withWorkflowExecutionIdentity(core, execution(), actual, child)
            ).rejects.toThrow('there is no caller to run it as');
          }
        );
      });
      expect(child).not.toHaveBeenCalled();
      expect(() => ensureWorkflowCallerAvailable(minted, { workflowId: 'child' })).not.toThrow();
    });

    it('lets the run start bound and inherited executions', async () => {
      const minted = httpServerMock.createKibanaRequest();

      await withWorkflowBindingRequest(minted, 'parent-execution', bindingRunAs, async () => {
        expect(() => ensureWorkflowCallerAvailable(minted, execution('account-b'))).not.toThrow();
        expect(() =>
          ensureWorkflowCallerAvailable(minted, {
            workflowId: 'child',
            effectiveIdentity: {
              type: 'service_account',
              id: 'account-a',
              inheritedFrom: { workloadId: 'workflow' },
            },
          })
        ).not.toThrow();
      });
    });

    it('lets a caller-started run start unbound executions as the caller', () => {
      expect(() =>
        ensureWorkflowCallerAvailable(httpServerMock.createKibanaRequest(), { workflowId: 'child' })
      ).not.toThrow();
    });
  });

  it.each([
    ['a missing binding', Boom.notFound('missing'), true],
    ['a changed binding', Boom.forbidden('changed'), true],
    ['a refused token exchange', tokenExchangeError(false), true],
    ['a token exchange that can be retried', tokenExchangeError(true), false],
    ['an unavailable dependency', Boom.serverUnavailable('down'), false],
    ['rate limiting', Boom.tooManyRequests('slow down'), false],
    ['a connection error', new Error('connect ECONNREFUSED'), false],
  ])('tells whether %s is a permanent mint failure', (_, error, permanent) => {
    expect(isPermanentMintFailure(error)).toBe(permanent);
  });

  it('does not fall back when the binding changed or the feature is disabled', async () => {
    const core = {
      ...coreMock.createStart(),
      security: securityServiceMock.createStart(),
      elasticsearch: elasticsearchServiceMock.createStart(),
    };
    const request = httpServerMock.createKibanaRequest();
    const run = jest.fn();
    core.security.serviceAccounts.isEnabled.mockReturnValue(false);
    await expect(withWorkflowExecutionIdentity(core, execution('a'), request, run)).rejects.toThrow(
      'disabled'
    );
    core.security.serviceAccounts.isEnabled.mockReturnValue(true);
    core.security.serviceAccounts.withScopedRequestForWorkload.mockRejectedValue(
      new Error('binding changed')
    );
    await expect(withWorkflowExecutionIdentity(core, execution('a'), request, run)).rejects.toThrow(
      'binding changed'
    );
    expect(run).not.toHaveBeenCalled();
  });

  it.each(['owner', 'unlisted', 'admin'])(
    'checks private workflow access as the original caller %s during service-account execution',
    async (profileId) => {
      const core = { ...coreMock.createStart(), security: securityServiceMock.createStart() };
      const request = httpServerMock.createKibanaRequest();
      const scopedRequest = httpServerMock.createKibanaRequest();
      core.security.serviceAccounts.isEnabled.mockReturnValue(true);
      core.security.serviceAccounts.withScopedRequestForWorkload.mockImplementation(
        async (_params, run) => run(scopedRequest)
      );
      core.userProfile.getCurrentProfileId.mockImplementation(async ({ request: actual }) =>
        actual === request ? profileId : null
      );

      core.security.authc.getCurrentUser.mockImplementation((actual) =>
        securityServiceMock.createMockAuthenticatedUser({
          roles: actual === scopedRequest || profileId === 'admin' ? ['superuser'] : [],
        })
      );
      const allowed = await withWorkflowExecutionIdentity(
        core,
        execution('account-a'),
        request,
        (actual) =>
          hasWorkflowAccess(
            { owner_id: 'owner', access_control: { access_mode: 'private', entries: [] } },
            actual,
            core,
            { id: 'workflow-id', spaceId: 'space-a' }
          )
      );

      expect(allowed).toBe(profileId === 'owner');
      const audit = core.security.audit.asScoped(request).log;
      expect(audit).toHaveBeenCalledTimes(profileId === 'owner' ? 0 : 1);
      if (profileId !== 'owner') {
        expect(core.security.audit.asScoped).not.toHaveBeenCalledWith(scopedRequest);
        expect(audit).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({ action: 'workflow_access_control_denied' }),
            kibana: { space_id: 'space-a' },
            message: expect.stringContaining('"entityId":"workflow-id"'),
          })
        );
      }
      expect(core.security.authc.getCurrentUser).not.toHaveBeenCalledWith(scopedRequest);
      expect(core.userProfile.getCurrentProfileId).toHaveBeenCalledWith({ request });
    }
  );
});
