/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { ServiceAccountsServiceContract } from '@kbn/core-security-server';
import { WorkloadTypeRegistry } from '../workload_type_registry';
import { createPluginScopedServiceAccounts } from './plugin_scoped_service_accounts';

const WORKLOAD = { workloadType: 'rule', workloadId: 'rule-id' };
const WORKLOAD_IN_SPACE = { ...WORKLOAD, spaceId: 'default' };

const createDelegate = (): jest.Mocked<ServiceAccountsServiceContract> => ({
  isEnabled: jest.fn().mockReturnValue(true),
  create: jest.fn(),
  delete: jest.fn(),
  bindWorkload: jest.fn(),
  unbindWorkload: jest.fn(),
  bulkUpdateWorkloadBindings: jest.fn(),
  getWorkloadBinding: jest.fn(),
  getWorkloadServiceAccountSummary: jest.fn(),
  withScopedRequestForWorkload: jest.fn(),
});

describe('createPluginScopedServiceAccounts', () => {
  let delegate: jest.Mocked<ServiceAccountsServiceContract>;
  let workloadTypes: WorkloadTypeRegistry;

  beforeEach(() => {
    delegate = createDelegate();
    workloadTypes = new WorkloadTypeRegistry();
    workloadTypes.register('alerting', { type: 'rule', name: 'Alerting rule' });
  });

  const scopedTo = (pluginId: string) =>
    createPluginScopedServiceAccounts({ pluginId, delegate, workloadTypes });

  it('passes `isEnabled`, `create`, and `delete` straight through', () => {
    const scoped = scopedTo('alerting');

    expect(scoped.isEnabled).toBe(delegate.isEnabled);
    expect(scoped.create).toBe(delegate.create);
    expect(scoped.delete).toBe(delegate.delete);
  });

  it('exposes exactly the public service accounts contract', () => {
    expect(Object.keys(scopedTo('alerting')).sort()).toEqual([
      'bindWorkload',
      'bulkUpdateWorkloadBindings',
      'create',
      'delete',
      'getWorkloadBinding',
      'getWorkloadServiceAccountSummary',
      'isEnabled',
      'unbindWorkload',
      'withScopedRequestForWorkload',
    ]);
  });

  describe('for a registered workload type', () => {
    it('binds with the plugin id first', async () => {
      const request = httpServerMock.createKibanaRequest();
      const params = { ...WORKLOAD, serviceAccountId: 'sa-1' };
      const binding = { pluginId: 'alerting' } as never;
      delegate.bindWorkload.mockResolvedValue(binding);

      await expect(scopedTo('alerting').bindWorkload(request, params)).resolves.toBe(binding);
      expect(delegate.bindWorkload).toHaveBeenCalledWith('alerting', request, params);
    });

    it('unbinds with the plugin id first', async () => {
      const request = httpServerMock.createKibanaRequest();

      await scopedTo('alerting').unbindWorkload(request, WORKLOAD);
      expect(delegate.unbindWorkload).toHaveBeenCalledWith('alerting', request, WORKLOAD);
    });

    it('bulk updates bindings with the plugin id first', async () => {
      const request = httpServerMock.createKibanaRequest();
      const changes = [
        { op: 'bind' as const, ...WORKLOAD, serviceAccountId: 'sa-1' },
        { op: 'unbind' as const, workloadType: 'rule', workloadId: 'other-rule-id' },
      ];
      const results = [] as never;
      delegate.bulkUpdateWorkloadBindings.mockResolvedValue(results);

      await expect(scopedTo('alerting').bulkUpdateWorkloadBindings(request, changes)).resolves.toBe(
        results
      );
      expect(delegate.bulkUpdateWorkloadBindings).toHaveBeenCalledWith(
        'alerting',
        request,
        changes
      );
    });

    it('passes the delegate a copy of the changes, with only the fields a change has', async () => {
      const changes = [
        { op: 'bind' as const, ...WORKLOAD, serviceAccountId: 'sa-1', spaceId: 'other-space' },
        {
          op: 'unbind' as const,
          workloadType: 'rule',
          workloadId: 'other',
          serviceAccountId: 'sa-2',
        },
      ];

      await scopedTo('alerting').bulkUpdateWorkloadBindings(
        httpServerMock.createKibanaRequest(),
        changes
      );

      const [[, , passed]] = delegate.bulkUpdateWorkloadBindings.mock.calls;
      expect(passed).not.toBe(changes);
      expect(passed).toStrictEqual([
        { op: 'bind', ...WORKLOAD, serviceAccountId: 'sa-1' },
        { op: 'unbind', workloadType: 'rule', workloadId: 'other' },
      ]);
    });

    it('applies what it checked, even when the caller changes its changes meanwhile', async () => {
      const changes = [{ op: 'bind' as const, ...WORKLOAD, serviceAccountId: 'sa-1' }];
      delegate.bulkUpdateWorkloadBindings.mockImplementation(async () => {
        changes[0].workloadType = 'job';
        return [];
      });

      await scopedTo('alerting').bulkUpdateWorkloadBindings(
        httpServerMock.createKibanaRequest(),
        changes
      );

      const [[, , passed]] = delegate.bulkUpdateWorkloadBindings.mock.calls;
      expect(passed).toStrictEqual([{ op: 'bind', ...WORKLOAD, serviceAccountId: 'sa-1' }]);
    });

    it('passes an empty bulk update through', async () => {
      const request = httpServerMock.createKibanaRequest();
      delegate.bulkUpdateWorkloadBindings.mockResolvedValue([]);

      await expect(scopedTo('alerting').bulkUpdateWorkloadBindings(request, [])).resolves.toEqual(
        []
      );
      expect(delegate.bulkUpdateWorkloadBindings).toHaveBeenCalledWith('alerting', request, []);
    });

    it('accepts a bulk update of exactly the maximum number of changes', async () => {
      const changes = Array.from({ length: 1000 }, (_, index) => ({
        op: 'unbind' as const,
        workloadType: 'rule',
        workloadId: `rule-${index}`,
      }));

      await scopedTo('alerting').bulkUpdateWorkloadBindings(
        httpServerMock.createKibanaRequest(),
        changes
      );
      expect(delegate.bulkUpdateWorkloadBindings).toHaveBeenCalledTimes(1);
    });

    it('gets a binding with the plugin id first', async () => {
      delegate.getWorkloadBinding.mockResolvedValue(null);

      await expect(scopedTo('alerting').getWorkloadBinding(WORKLOAD_IN_SPACE)).resolves.toBeNull();
      expect(delegate.getWorkloadBinding).toHaveBeenCalledWith('alerting', WORKLOAD_IN_SPACE);
    });

    it('names the bound account with the plugin id first', async () => {
      const summary = { id: 'sa-1', name: 'Nightshift', enabled: true, assumable: true };
      delegate.getWorkloadServiceAccountSummary.mockResolvedValue(summary);

      await expect(
        scopedTo('alerting').getWorkloadServiceAccountSummary(WORKLOAD_IN_SPACE)
      ).resolves.toBe(summary);
      expect(delegate.getWorkloadServiceAccountSummary).toHaveBeenCalledWith(
        'alerting',
        WORKLOAD_IN_SPACE
      );
    });

    it('runs a scoped request with the plugin id first', async () => {
      const fn = jest.fn();
      delegate.withScopedRequestForWorkload.mockResolvedValue('result');

      await expect(
        scopedTo('alerting').withScopedRequestForWorkload(WORKLOAD_IN_SPACE, fn)
      ).resolves.toBe('result');
      expect(delegate.withScopedRequestForWorkload).toHaveBeenCalledWith(
        'alerting',
        WORKLOAD_IN_SPACE,
        fn
      );
    });

    it('passes the execution id of a scoped request through', async () => {
      const fn = jest.fn();
      const params = { ...WORKLOAD_IN_SPACE, executionId: 'x'.repeat(512) };

      await scopedTo('alerting').withScopedRequestForWorkload(params, fn);
      expect(delegate.withScopedRequestForWorkload).toHaveBeenCalledWith('alerting', params, fn);
    });

    it.each([
      [
        'an empty execution id',
        '',
        'Plugin [alerting] supplied an empty service account workload execution ID; execution IDs must be non-empty strings when supplied.',
      ],
      [
        'an execution id longer than 512 characters',
        'x'.repeat(513),
        'Plugin [alerting] supplied a service account workload execution ID that is too long: it must be at most 512 characters, but got 513.',
      ],
    ])('rejects %s without reaching the delegate', async (_name, executionId, expectedMessage) => {
      await expect(
        scopedTo('alerting').withScopedRequestForWorkload(
          { ...WORKLOAD_IN_SPACE, executionId },
          jest.fn()
        )
      ).rejects.toThrow(expectedMessage);
      expect(delegate.withScopedRequestForWorkload).not.toHaveBeenCalled();
    });
  });

  describe('for a workload type the plugin did not register', () => {
    const expectedMessage =
      'Plugin [alerting] has not registered service account workload type [job]. Register it with core.security.serviceAccounts.registerWorkloadType() during setup.';
    const unregistered = { workloadType: 'job', workloadId: 'job-id' };

    it.each([
      [
        'bindWorkload',
        (scoped: ReturnType<typeof scopedTo>) =>
          scoped.bindWorkload(httpServerMock.createKibanaRequest(), {
            ...unregistered,
            serviceAccountId: 'sa-1',
          }),
      ],
      [
        'unbindWorkload',
        (scoped: ReturnType<typeof scopedTo>) =>
          scoped.unbindWorkload(httpServerMock.createKibanaRequest(), unregistered),
      ],
      [
        'bulkUpdateWorkloadBindings',
        (scoped: ReturnType<typeof scopedTo>) =>
          scoped.bulkUpdateWorkloadBindings(httpServerMock.createKibanaRequest(), [
            { op: 'unbind', ...WORKLOAD },
            { op: 'bind', ...unregistered, serviceAccountId: 'sa-1' },
          ]),
      ],
      [
        'getWorkloadBinding',
        (scoped: ReturnType<typeof scopedTo>) =>
          scoped.getWorkloadBinding({ ...unregistered, spaceId: 'default' }),
      ],
      [
        'getWorkloadServiceAccountSummary',
        (scoped: ReturnType<typeof scopedTo>) =>
          scoped.getWorkloadServiceAccountSummary({ ...unregistered, spaceId: 'default' }),
      ],
      [
        'withScopedRequestForWorkload',
        (scoped: ReturnType<typeof scopedTo>) =>
          scoped.withScopedRequestForWorkload({ ...unregistered, spaceId: 'default' }, jest.fn()),
      ],
    ])('%s rejects without reaching the delegate', async (_name, call) => {
      await expect(call(scopedTo('alerting'))).rejects.toThrow(expectedMessage);

      expect(delegate.bindWorkload).not.toHaveBeenCalled();
      expect(delegate.unbindWorkload).not.toHaveBeenCalled();
      expect(delegate.bulkUpdateWorkloadBindings).not.toHaveBeenCalled();
      expect(delegate.getWorkloadBinding).not.toHaveBeenCalled();
      expect(delegate.getWorkloadServiceAccountSummary).not.toHaveBeenCalled();
      expect(delegate.withScopedRequestForWorkload).not.toHaveBeenCalled();
    });
  });

  describe('for a malformed workload ID', () => {
    const calls = (workloadId: string) =>
      [
        [
          'bindWorkload',
          (scoped: ReturnType<typeof scopedTo>) =>
            scoped.bindWorkload(httpServerMock.createKibanaRequest(), {
              ...WORKLOAD,
              workloadId,
              serviceAccountId: 'sa-1',
            }),
        ],
        [
          'unbindWorkload',
          (scoped: ReturnType<typeof scopedTo>) =>
            scoped.unbindWorkload(httpServerMock.createKibanaRequest(), {
              ...WORKLOAD,
              workloadId,
            }),
        ],
        [
          'bulkUpdateWorkloadBindings',
          (scoped: ReturnType<typeof scopedTo>) =>
            scoped.bulkUpdateWorkloadBindings(httpServerMock.createKibanaRequest(), [
              { op: 'bind', ...WORKLOAD, workloadId, serviceAccountId: 'sa-1' },
            ]),
        ],
        [
          'getWorkloadBinding',
          (scoped: ReturnType<typeof scopedTo>) =>
            scoped.getWorkloadBinding({ ...WORKLOAD_IN_SPACE, workloadId }),
        ],
        [
          'getWorkloadServiceAccountSummary',
          (scoped: ReturnType<typeof scopedTo>) =>
            scoped.getWorkloadServiceAccountSummary({ ...WORKLOAD_IN_SPACE, workloadId }),
        ],
        [
          'withScopedRequestForWorkload',
          (scoped: ReturnType<typeof scopedTo>) =>
            scoped.withScopedRequestForWorkload({ ...WORKLOAD_IN_SPACE, workloadId }, jest.fn()),
        ],
      ] as const;

    const expectNoDelegateCalls = () => {
      expect(delegate.bindWorkload).not.toHaveBeenCalled();
      expect(delegate.unbindWorkload).not.toHaveBeenCalled();
      expect(delegate.bulkUpdateWorkloadBindings).not.toHaveBeenCalled();
      expect(delegate.getWorkloadBinding).not.toHaveBeenCalled();
      expect(delegate.getWorkloadServiceAccountSummary).not.toHaveBeenCalled();
      expect(delegate.withScopedRequestForWorkload).not.toHaveBeenCalled();
    };

    it.each(calls(''))(
      '%s rejects an empty ID without reaching the delegate',
      async (_name, call) => {
        await expect(call(scopedTo('alerting'))).rejects.toThrow(
          'Plugin [alerting] supplied an empty service account workload ID; workload IDs must be non-empty strings.'
        );
        expectNoDelegateCalls();
      }
    );

    it.each(calls('x'.repeat(513)))(
      '%s rejects an ID longer than 512 characters without reaching the delegate',
      async (_name, call) => {
        await expect(call(scopedTo('alerting'))).rejects.toThrow(
          'Plugin [alerting] supplied a service account workload ID that is too long: it must be at most 512 characters, but got 513.'
        );
        expectNoDelegateCalls();
      }
    );

    it('accepts an ID of exactly 512 characters', async () => {
      delegate.getWorkloadBinding.mockResolvedValue(null);
      const params = { ...WORKLOAD_IN_SPACE, workloadId: 'x'.repeat(512) };

      await expect(scopedTo('alerting').getWorkloadBinding(params)).resolves.toBeNull();
      expect(delegate.getWorkloadBinding).toHaveBeenCalledWith('alerting', params);
    });
  });

  describe('for a bind that names no usable service account', () => {
    const binds = (serviceAccountId: unknown) =>
      [
        [
          'bindWorkload',
          (scoped: ReturnType<typeof scopedTo>) =>
            scoped.bindWorkload(httpServerMock.createKibanaRequest(), {
              ...WORKLOAD,
              serviceAccountId,
            } as never),
        ],
        [
          'bulkUpdateWorkloadBindings',
          (scoped: ReturnType<typeof scopedTo>) =>
            scoped.bulkUpdateWorkloadBindings(httpServerMock.createKibanaRequest(), [
              { op: 'unbind', workloadType: 'rule', workloadId: 'other-rule-id' },
              { op: 'bind', ...WORKLOAD, serviceAccountId } as never,
            ]),
        ],
      ] as const;

    const expectNoDelegateCalls = () => {
      expect(delegate.bindWorkload).not.toHaveBeenCalled();
      expect(delegate.bulkUpdateWorkloadBindings).not.toHaveBeenCalled();
    };

    it.each([
      ...binds('').map(([name, call]) => [name, 'an empty ID', call] as const),
      ...binds(undefined).map(([name, call]) => [name, 'a missing ID', call] as const),
      ...binds(42).map(([name, call]) => [name, 'an ID that is not a string', call] as const),
    ])('%s rejects %s without reaching the delegate', async (_name, _case, call) => {
      await expect(call(scopedTo('alerting'))).rejects.toThrow(
        'Plugin [alerting] supplied an empty service account ID; a bind must name the service account as a non-empty string.'
      );
      expectNoDelegateCalls();
    });

    it.each(binds('x'.repeat(1025)))(
      '%s rejects an ID longer than 1024 characters without reaching the delegate',
      async (_name, call) => {
        await expect(call(scopedTo('alerting'))).rejects.toThrow(
          'Plugin [alerting] supplied a service account ID that is too long: it must be at most 1024 characters, but got 1025.'
        );
        expectNoDelegateCalls();
      }
    );

    it('accepts an ID of exactly 1024 characters', async () => {
      const params = { ...WORKLOAD, serviceAccountId: 'x'.repeat(1024) };

      await scopedTo('alerting').bindWorkload(httpServerMock.createKibanaRequest(), params);
      expect(delegate.bindWorkload).toHaveBeenCalledWith('alerting', expect.anything(), params);
    });
  });

  describe('for a malformed bulk update', () => {
    it.each([
      [
        'more than the maximum number of changes',
        Array.from({ length: 1001 }, (_, index) => ({
          op: 'unbind',
          workloadType: 'rule',
          workloadId: `rule-${index}`,
        })),
        'Plugin [alerting] supplied too many service account workload binding changes: at most 1000 are allowed in one call, but got 1001.',
      ],
      [
        'two changes to the same workload',
        [
          { op: 'bind', ...WORKLOAD, serviceAccountId: 'sa-1' },
          { op: 'unbind', ...WORKLOAD },
        ],
        'Plugin [alerting] supplied more than one service account workload binding change for workload [rule/rule-id].',
      ],
      [
        'an unknown operation',
        [{ op: 'rebind', ...WORKLOAD, serviceAccountId: 'sa-1' }],
        'Plugin [alerting] supplied a service account workload binding change with an unknown operation; it must be "bind" or "unbind".',
      ],
      [
        'changes that are not an array',
        { op: 'unbind', ...WORKLOAD },
        'Plugin [alerting] supplied service account workload binding changes that are not an array.',
      ],
    ])('rejects %s without reaching the delegate', async (_name, changes, expectedMessage) => {
      await expect(
        scopedTo('alerting').bulkUpdateWorkloadBindings(
          httpServerMock.createKibanaRequest(),
          changes as never
        )
      ).rejects.toThrow(expectedMessage);
      expect(delegate.bulkUpdateWorkloadBindings).not.toHaveBeenCalled();
    });

    it('accepts the same workload ID under two workload types', async () => {
      workloadTypes.register('alerting', { type: 'backfill', name: 'Alerting backfill' });

      await scopedTo('alerting').bulkUpdateWorkloadBindings(httpServerMock.createKibanaRequest(), [
        { op: 'unbind', workloadType: 'rule', workloadId: 'shared-id' },
        { op: 'unbind', workloadType: 'backfill', workloadId: 'shared-id' },
      ]);
      expect(delegate.bulkUpdateWorkloadBindings).toHaveBeenCalledTimes(1);
    });
  });

  it('cannot reach a type that only another plugin registered', async () => {
    await expect(scopedTo('workflows').getWorkloadBinding(WORKLOAD_IN_SPACE)).rejects.toThrow(
      'Plugin [workflows] has not registered service account workload type [rule].'
    );
    expect(delegate.getWorkloadBinding).not.toHaveBeenCalled();
  });
});
