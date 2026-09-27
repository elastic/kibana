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
import {
  getWorkflowOriginalRequest,
  withWorkflowExecutionIdentity,
} from './service_account_execution';

describe('workflow service account execution', () => {
  const execution = (accountId?: string) => ({
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
      },
      expect.any(Function)
    );
    expect(getWorkflowOriginalRequest(scoped)).toBe(scoped);
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
});
