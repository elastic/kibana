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
  elasticsearchServiceMock,
  httpServerMock,
  securityServiceMock,
} from '@kbn/core/server/mocks';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { hasWorkflowAccess } from './lib/has_workflow_access';
import {
  getWorkflowInitiatingUser,
  getWorkflowTaskRunAs,
  withWorkflowExecutionIdentity,
} from './service_account_execution';

describe('workflow service account execution', () => {
  const execution = (accountId?: string) => ({
    id: 'parent-execution',
    executedBy: 'initiating-user',
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

  it('supports legacy tasks while keeping initiating-user metadata separate from identity', async () => {
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
      expect(getWorkflowInitiatingUser(actual)).toBe('initiating-user');
      await withWorkflowExecutionIdentity(core, execution(), actual, child);
    });
    expect(child).toHaveBeenCalledWith(scoped);
    expect(core.security.serviceAccounts.withScopedRequestForWorkload).toHaveBeenCalledWith(
      {
        workloadType: 'workflow',
        workloadId: 'workflow',
        spaceId: 'space',
        expectedServiceAccountId: 'account-a',
      },
      expect.any(Function)
    );
    expect(getWorkflowInitiatingUser(scoped)).toBeUndefined();
  });

  it('uses Task Manager scoping without original credentials and keeps the account pin', async () => {
    const core = { ...coreMock.createStart(), security: securityServiceMock.createStart() };
    core.security.serviceAccounts.isEnabled.mockReturnValue(true);
    const request = httpServerMock.createKibanaRequest();
    const runAs: NonNullable<RunContext['runAs']> = { withScopedRequest: jest.fn() };
    jest.mocked(runAs.withScopedRequest).mockImplementation(async (fn) => fn(request));
    const run = jest.fn().mockResolvedValue('done');
    await expect(
      withWorkflowExecutionIdentity(core, execution('account-a'), undefined, run, runAs)
    ).resolves.toBe('done');
    expect(runAs.withScopedRequest).toHaveBeenCalledWith(expect.any(Function), {
      expectedServiceAccountId: 'account-a',
    });
    expect(core.security.serviceAccounts.withScopedRequestForWorkload).not.toHaveBeenCalled();
    expect(run).toHaveBeenCalledWith(request);
    expect(getWorkflowInitiatingUser(request)).toBeUndefined();
    expect(
      getWorkflowTaskRunAs({
        ...execution('account-a'),
        effectiveIdentity: {
          type: 'service_account',
          id: 'account-b',
          inheritedFrom: { workloadId: 'root' },
        },
      })
    ).toEqual({
      workloadType: 'workflow',
      workloadId: 'root',
      spaceId: 'space',
      expectedServiceAccountId: 'account-b',
    });
  });

  it('rejects a native service-account task for a non-SA execution', async () => {
    const core = { ...coreMock.createStart(), security: securityServiceMock.createStart() };
    const runAs = { withScopedRequest: jest.fn() };
    const run = jest.fn();
    await expect(
      withWorkflowExecutionIdentity(core, execution(), undefined, run, runAs)
    ).rejects.toThrow('identity does not match');
    expect(runAs.withScopedRequest).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
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
    'does not recover original caller %s privileges for private workflow access',
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

      expect(allowed).toBe(false);
      const audit = core.security.audit.asScoped(request).log;
      expect(audit).toHaveBeenCalledTimes(1);
      expect(core.security.audit.asScoped).toHaveBeenCalledWith(scopedRequest);
      expect(audit).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({ action: 'workflow_access_control_denied' }),
          kibana: { space_id: 'space-a' },
          message: expect.stringContaining('"entityId":"workflow-id"'),
        })
      );
      expect(core.security.authc.getCurrentUser).not.toHaveBeenCalledWith(scopedRequest);
      expect(core.userProfile.getCurrentProfileId).toHaveBeenCalledWith({ request: scopedRequest });
    }
  );
});
