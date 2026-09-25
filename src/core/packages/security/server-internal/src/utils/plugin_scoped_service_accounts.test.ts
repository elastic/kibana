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
  authorize: jest.fn(),
  create: jest.fn(),
  bindWorkload: jest.fn(),
  unbindWorkload: jest.fn(),
  getWorkloadBinding: jest.fn(),
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

  it('passes `isEnabled` and `create` straight through', () => {
    const scoped = scopedTo('alerting');

    expect(scoped.isEnabled).toBe(delegate.isEnabled);
    expect(scoped.authorize).toBe(delegate.authorize);
    expect(scoped.create).toBe(delegate.create);
  });

  it('exposes exactly the public service accounts contract', () => {
    expect(Object.keys(scopedTo('alerting')).sort()).toEqual([
      'authorize',
      'bindWorkload',
      'create',
      'getWorkloadBinding',
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

    it('gets a binding with the plugin id first', async () => {
      delegate.getWorkloadBinding.mockResolvedValue(null);

      await expect(scopedTo('alerting').getWorkloadBinding(WORKLOAD_IN_SPACE)).resolves.toBeNull();
      expect(delegate.getWorkloadBinding).toHaveBeenCalledWith('alerting', WORKLOAD_IN_SPACE);
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
        'getWorkloadBinding',
        (scoped: ReturnType<typeof scopedTo>) =>
          scoped.getWorkloadBinding({ ...unregistered, spaceId: 'default' }),
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
      expect(delegate.getWorkloadBinding).not.toHaveBeenCalled();
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
          'getWorkloadBinding',
          (scoped: ReturnType<typeof scopedTo>) =>
            scoped.getWorkloadBinding({ ...WORKLOAD_IN_SPACE, workloadId }),
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
      expect(delegate.getWorkloadBinding).not.toHaveBeenCalled();
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

  it('cannot reach a type that only another plugin registered', async () => {
    await expect(scopedTo('workflows').getWorkloadBinding(WORKLOAD_IN_SPACE)).rejects.toThrow(
      'Plugin [workflows] has not registered service account workload type [rule].'
    );
    expect(delegate.getWorkloadBinding).not.toHaveBeenCalled();
  });
});
