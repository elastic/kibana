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
import type {
  ServiceAccountWorkloadBindingChange,
  ServiceAccountWorkloadBindingChangeResult,
} from '@kbn/core-security-server';
import {
  applyWorkflowBindingChanges,
  reconcileWorkflowBindings,
  withWorkflowBindingChange,
} from './workflow_service_account_binding';

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

/** Applies every change, as the binding store would when nothing fails. */
const applyAll =
  (binding: ReturnType<typeof setup>['binding']) =>
  async (
    _request: unknown,
    changes: readonly ServiceAccountWorkloadBindingChange[]
  ): Promise<ServiceAccountWorkloadBindingChangeResult[]> =>
    changes.map((change) =>
      change.op === 'bind'
        ? {
            ...change,
            ok: true,
            binding: {
              ...binding,
              workloadId: change.workloadId,
              serviceAccountId: change.serviceAccountId,
            },
          }
        : { ...change, ok: true, removed: true }
    );

describe('bulk workflow binding changes', () => {
  it('binds and unbinds many workflows in one call and reports each outcome', async () => {
    const { params, bindings, binding } = setup();
    bindings.bulkUpdateWorkloadBindings.mockImplementation(async (request, changes) => [
      ...(await applyAll(binding)(request, changes.slice(0, 1))),
      {
        op: 'bind',
        workloadType: 'workflow',
        workloadId: 'refused',
        ok: false,
        error: { statusCode: 403, message: 'refused' },
      },
      {
        op: 'bind',
        workloadType: 'workflow',
        workloadId: 'timed-out',
        ok: false,
        error: { statusCode: 503, message: 'unavailable' },
      },
      { op: 'unbind', workloadType: 'workflow', workloadId: 'gone', ok: true, removed: false },
    ]);

    const outcomes = await applyWorkflowBindingChanges({
      ...params,
      targets: [
        { workflowId: 'bound', accountId: 'a' },
        { workflowId: 'refused', accountId: 'a' },
        { workflowId: 'timed-out', accountId: 'a' },
        { workflowId: 'gone' },
      ],
    });

    expect(bindings.bulkUpdateWorkloadBindings).toHaveBeenCalledTimes(1);
    expect(bindings.bulkUpdateWorkloadBindings).toHaveBeenCalledWith(params.request, [
      { op: 'bind', workloadType: 'workflow', workloadId: 'bound', serviceAccountId: 'a' },
      { op: 'bind', workloadType: 'workflow', workloadId: 'refused', serviceAccountId: 'a' },
      { op: 'bind', workloadType: 'workflow', workloadId: 'timed-out', serviceAccountId: 'a' },
      { op: 'unbind', workloadType: 'workflow', workloadId: 'gone' },
    ]);
    expect(Object.fromEntries(outcomes)).toEqual({
      bound: { ok: true, written: { ...binding, workloadId: 'bound' }, changed: true },
      refused: { ok: false, error: 'refused', mayHaveApplied: false },
      'timed-out': { ok: false, error: 'unavailable', mayHaveApplied: true },
      gone: { ok: true, written: null, changed: false },
    });
    expect(bindings.getWorkloadBinding).not.toHaveBeenCalled();
    expect(bindings.bindWorkload).not.toHaveBeenCalled();
  });

  it('splits changes into calls of at most the Core limit', async () => {
    const { params, bindings, binding } = setup();
    bindings.bulkUpdateWorkloadBindings.mockImplementation(applyAll(binding));
    const targets = Array.from({ length: 1001 }, (_, index) => ({
      workflowId: `workflow-${index}`,
      accountId: 'a',
    }));

    const outcomes = await applyWorkflowBindingChanges({ ...params, targets });

    expect(
      bindings.bulkUpdateWorkloadBindings.mock.calls.map(([, changes]) => changes.length)
    ).toEqual([1000, 1]);
    expect(outcomes.size).toBe(1001);
  });

  it('rejects before changing any binding when the caller lacks manage_security', async () => {
    const { params, bindings, client } = setup();
    client.security.hasPrivileges.mockResolvedValue({
      has_all_requested: false,
      username: 'editor',
      cluster: { manage_security: false },
      index: {},
      application: {},
    });

    await expect(
      applyWorkflowBindingChanges({ ...params, targets: [{ workflowId: 'w', accountId: 'a' }] })
    ).rejects.toThrow('manage_security');
    expect(bindings.bulkUpdateWorkloadBindings).not.toHaveBeenCalled();
  });

  it('reconciles failed writes to their persisted workflow revisions', async () => {
    const { params, bindings, binding } = setup();
    const written = { ...binding, workloadId: 'not-created' };
    bindings.getWorkloadBinding.mockImplementation(async ({ workloadId }) => {
      if (workloadId === 'not-created') return written;
      if (workloadId === 'not-deleted') return null;
      if (workloadId === 'changed-since') return { ...binding, serviceAccountId: 'other' };
      return { ...binding, workloadId };
    });
    bindings.bulkUpdateWorkloadBindings.mockImplementation(applyAll(binding));
    const getWorkflowRevision = jest.fn(async (workflowId: string) =>
      workflowId === 'not-deleted' ? { seqNo: 1, primaryTerm: 1, accountId: 'a' } : null
    );

    const unreconciled = await reconcileWorkflowBindings({
      ...params,
      getWorkflowRevision,
      workflows: [
        { workflowId: 'not-created', written },
        { workflowId: 'not-deleted', written: null },
        { workflowId: 'changed-since', written },
        { workflowId: 'unknown' },
      ],
    });

    expect(unreconciled).toEqual(new Set());
    expect(bindings.bulkUpdateWorkloadBindings).toHaveBeenCalledTimes(1);
    expect(bindings.bulkUpdateWorkloadBindings).toHaveBeenCalledWith(params.request, [
      { op: 'unbind', workloadType: 'workflow', workloadId: 'not-created' },
      { op: 'bind', workloadType: 'workflow', workloadId: 'not-deleted', serviceAccountId: 'a' },
      { op: 'unbind', workloadType: 'workflow', workloadId: 'unknown' },
    ]);
    expect(getWorkflowRevision).not.toHaveBeenCalledWith('changed-since');
  });

  it('reports workflows it could not reconcile', async () => {
    const { params, bindings, binding } = setup();
    bindings.getWorkloadBinding.mockImplementation(async ({ workloadId }) => {
      if (workloadId === 'unreadable') throw new Error('read failed');
      return { ...binding, workloadId };
    });
    bindings.bulkUpdateWorkloadBindings.mockRejectedValue(new Error('write failed'));

    const unreconciled = await reconcileWorkflowBindings({
      ...params,
      workflows: [
        { workflowId: 'unreadable', written: { ...binding, workloadId: 'unreadable' } },
        { workflowId: 'unwritable', written: { ...binding, workloadId: 'unwritable' } },
      ],
    });

    expect(unreconciled).toEqual(new Set(['unreadable', 'unwritable']));
  });
});
