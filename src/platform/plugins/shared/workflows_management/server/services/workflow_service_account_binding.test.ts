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
      getSpaceId: jest.fn().mockReturnValue('default'),
      core,
      bindings,
      logger: loggingSystemMock.createLogger(),
      workflowId: 'workflow',
      spaceId: 'default',
      request: httpServerMock.createKibanaRequest(),
      accountId: 'a',
      write: jest.fn().mockResolvedValue('saved'),
      getWorkflowRevision: jest.fn().mockResolvedValue(null),
    },
  };
};

describe('workflow binding reconciliation', () => {
  it('rejects a global binding before changing either storage system', async () => {
    const { params, bindings } = setup();
    await expect(withWorkflowBindingChange({ ...params, spaceId: '*' })).rejects.toThrow(
      'specific space'
    );
    expect(bindings.bindWorkload).not.toHaveBeenCalled();
    expect(bindings.unbindWorkload).not.toHaveBeenCalled();
    expect(params.write).not.toHaveBeenCalled();
  });

  it.each(['a', undefined])(
    'rejects a cross-space mutation before binding changes (%s)',
    async (accountId) => {
      const { params, bindings } = setup();
      await expect(
        withWorkflowBindingChange({
          ...params,
          spaceId: 'other',
          previousAccountId: 'a',
          accountId,
        })
      ).rejects.toThrow('request must target');
      expect(bindings.getWorkloadBinding).not.toHaveBeenCalled();
      expect(bindings.bindWorkload).not.toHaveBeenCalled();
      expect(bindings.unbindWorkload).not.toHaveBeenCalled();
      expect(params.write).not.toHaveBeenCalled();
    }
  );

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

describe('concurrent workflow writes sharing a binding', () => {
  it.each([undefined, 'previous-account'])(
    'keeps the winning binding after a losing write (original account: %s)',
    async (previousAccountId) => {
      const { params, bindings, binding } = setup();
      let currentBinding = previousAccountId
        ? { ...binding, serviceAccountId: previousAccountId }
        : null;
      let revision = previousAccountId
        ? { seqNo: 1, primaryTerm: 1, accountId: previousAccountId }
        : null;
      params.getWorkflowRevision.mockImplementation(async () => revision);
      bindings.getWorkloadBinding.mockImplementation(async () => currentBinding);
      bindings.bindWorkload.mockImplementation(async () => {
        currentBinding = binding;
        return binding;
      });
      params.write.mockImplementationOnce(async () => {
        // Y observes X's binding, reuses it, and wins the workflow write before X fails.
        await withWorkflowBindingChange({
          ...params,
          previousAccountId,
          write: async () => {
            revision = { seqNo: 2, primaryTerm: 1, accountId: 'a' };
            return 'winner';
          },
        });
        throw new Error('losing write conflict');
      });

      await expect(withWorkflowBindingChange({ ...params, previousAccountId })).rejects.toThrow(
        'losing write conflict'
      );
      expect(currentBinding).toEqual(binding);
      expect(bindings.bindWorkload).toHaveBeenCalledTimes(1);
      expect(bindings.unbindWorkload).not.toHaveBeenCalled();
      expect(params.logger.error).not.toHaveBeenCalled();
    }
  );

  it('does not restore a binding when a failed deletion actually removed the workflow', async () => {
    const { params, bindings, binding } = setup();
    bindings.getWorkloadBinding.mockResolvedValueOnce(binding).mockResolvedValueOnce(null);
    params.getWorkflowRevision.mockResolvedValue(null);
    params.write.mockRejectedValue(new Error('delete response lost'));
    await expect(
      withWorkflowBindingChange({
        ...params,
        previousAccountId: 'a',
        accountId: undefined,
      })
    ).rejects.toThrow('delete response lost');
    expect(bindings.bindWorkload).not.toHaveBeenCalled();
  });

  it('does not compensate when the workflow revision cannot be re-read', async () => {
    const { params, bindings, binding } = setup();
    bindings.getWorkloadBinding.mockResolvedValueOnce(null).mockResolvedValueOnce(binding);
    params.getWorkflowRevision.mockRejectedValueOnce(new Error('unavailable'));
    params.write.mockRejectedValue(new Error('write failed'));
    await expect(withWorkflowBindingChange(params)).rejects.toThrow('compensation failed');
    expect(bindings.unbindWorkload).not.toHaveBeenCalled();
  });
});

describe('concurrent workflow writes with different accounts', () => {
  it('reconciles the losing binding to the persisted winning workflow', async () => {
    const { params, bindings, binding } = setup();
    let currentBinding = { ...binding, serviceAccountId: 'original' };
    let revision = { seqNo: 1, primaryTerm: 1, accountId: 'original' };
    params.getWorkflowRevision.mockImplementation(async () => revision);
    bindings.getWorkloadBinding.mockImplementation(async () => currentBinding);
    bindings.bindWorkload.mockImplementation(async (_request, options) => {
      currentBinding = { ...binding, serviceAccountId: options.serviceAccountId };
      return currentBinding;
    });
    params.write.mockImplementationOnce(async () => {
      // X has bound A. Y binds B, but X wins the document write before Y loses OCC.
      await expect(
        withWorkflowBindingChange({
          ...params,
          previousAccountId: 'original',
          accountId: 'b',
          write: async () => {
            revision = { seqNo: 2, primaryTerm: 1, accountId: 'a' };
            throw new Error('Y lost OCC');
          },
        })
      ).rejects.toThrow('Y lost OCC');
      return 'X won';
    });
    await expect(
      withWorkflowBindingChange({ ...params, previousAccountId: 'original' })
    ).resolves.toBe('X won');
    expect(currentBinding.serviceAccountId).toBe(revision.accountId);
    expect(bindings.bindWorkload.mock.calls.map(([, options]) => options.serviceAccountId)).toEqual(
      ['a', 'b', 'a']
    );
    expect(bindings.unbindWorkload).not.toHaveBeenCalled();
  });
});

it('reconciles to persisted identity when both competing writes fail', async () => {
  const { params, bindings, binding } = setup();
  let currentBinding = { ...binding, serviceAccountId: 'original' };
  params.getWorkflowRevision.mockResolvedValue({ seqNo: 1, primaryTerm: 1, accountId: 'original' });
  bindings.getWorkloadBinding.mockImplementation(async () => currentBinding);
  bindings.bindWorkload.mockImplementation(async (_request, options) => {
    currentBinding = { ...binding, serviceAccountId: options.serviceAccountId };
    return currentBinding;
  });
  let failFirstWrite: () => void = () => {};
  const firstFailure = new Promise<void>((resolve) => {
    failFirstWrite = resolve;
  });
  let markFirstWriteReached: () => void = () => {};
  const firstReachedWrite = new Promise<void>((resolve) => {
    markFirstWriteReached = resolve;
  });
  const first = withWorkflowBindingChange({
    ...params,
    write: async () => {
      markFirstWriteReached();
      await firstFailure;
      throw new Error('X failed');
    },
  });
  const firstRejected = expect(first).rejects.toThrow('X failed');
  await firstReachedWrite;
  await expect(
    withWorkflowBindingChange({
      ...params,
      accountId: 'b',
      write: async () => {
        failFirstWrite();
        await firstRejected;
        throw new Error('Y failed');
      },
    })
  ).rejects.toThrow('Y failed');
  expect(currentBinding.serviceAccountId).toBe('original');
});
