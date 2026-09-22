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
  loggingSystemMock,
  securityServiceMock,
} from '@kbn/core/server/mocks';
import { withWorkflowBindingChange } from './workflow_service_account_binding';

const setup = () => {
  const core = {
    ...coreMock.createStart(),
    security: securityServiceMock.createStart(),
    elasticsearch: elasticsearchServiceMock.createStart(),
  };
  const bindings = core.security.serviceAccounts;
  bindings.isEnabled.mockReturnValue(true);
  bindings.getWorkloadBinding.mockResolvedValue(null);
  const client = core.elasticsearch.client.asScoped().asCurrentUser;
  client.security.hasPrivileges.mockResolvedValue({
    has_all_requested: true,
    username: 'owner',
    cluster: { manage_security: true },
    index: {},
    application: {},
  });
  const binding = {
    pluginId: 'workflowsExecutionEngine',
    workloadType: 'workflow',
    workloadId: 'workflow',
    spaceId: 'default',
    serviceAccountId: 'a',
    boundBy: { type: 'user' as const, username: 'owner' },
    boundAt: '2026-09-22',
  };
  bindings.bindWorkload.mockResolvedValue(binding);
  return {
    core,
    bindings,
    client,
    binding,
    params: {
      core,
      bindings,
      logger: loggingSystemMock.createLogger(),
      workflowId: 'workflow',
      spaceId: 'default',
      request: httpServerMock.createKibanaRequest(),
      accountId: 'a',
      write: jest.fn().mockResolvedValue('saved'),
    },
  };
};

describe('workflow binding reconciliation', () => {
  it('requires manage_security even if the account has not changed', async () => {
    const { client, params, bindings } = setup();
    client.security.hasPrivileges.mockResolvedValue({
      has_all_requested: false,
      username: 'editor',
      cluster: { manage_security: false },
      index: {},
      application: {},
    });
    await expect(withWorkflowBindingChange({ ...params, previousAccountId: 'a' })).rejects.toThrow(
      'manage_security'
    );
    expect(params.write).not.toHaveBeenCalled();
    expect(bindings.bindWorkload).not.toHaveBeenCalled();
  });

  it('rejects removing a bound identity when the feature is disabled', async () => {
    const { params, bindings } = setup();
    bindings.isEnabled.mockReturnValue(false);
    await expect(
      withWorkflowBindingChange({ ...params, previousAccountId: 'a', accountId: undefined })
    ).rejects.toThrow('disabled');
    expect(params.write).not.toHaveBeenCalled();
    expect(bindings.unbindWorkload).not.toHaveBeenCalled();
  });

  it('binds before saving and compensates a failed save', async () => {
    const { params, bindings, binding } = setup();
    bindings.getWorkloadBinding.mockResolvedValueOnce(null).mockResolvedValueOnce(binding);
    params.write.mockRejectedValue(new Error('write failed'));
    await expect(withWorkflowBindingChange(params)).rejects.toThrow('write failed');
    expect(bindings.unbindWorkload).toHaveBeenCalledWith(params.request, {
      workloadType: 'workflow',
      workloadId: 'workflow',
    });
    expect(bindings.bindWorkload.mock.invocationCallOrder[0]).toBeLessThan(
      params.write.mock.invocationCallOrder[0]
    );
  });

  it('does not compensate over an observed newer binding', async () => {
    const { params, bindings, binding } = setup();
    bindings.getWorkloadBinding
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...binding, serviceAccountId: 'b' });
    params.write.mockRejectedValue(new Error('conflict'));
    await expect(withWorkflowBindingChange(params)).rejects.toThrow('conflict');
    expect(bindings.unbindWorkload).not.toHaveBeenCalled();
    expect(params.logger.error).toHaveBeenCalled();
  });

  it('reports failed compensation rather than returning success', async () => {
    const { params, bindings, binding } = setup();
    bindings.getWorkloadBinding.mockResolvedValueOnce(null).mockResolvedValueOnce(binding);
    bindings.unbindWorkload.mockRejectedValue(new Error('store unavailable'));
    params.write.mockRejectedValue(new Error('write failed'));
    await expect(withWorkflowBindingChange(params)).rejects.toThrow('compensation failed');
  });
});
