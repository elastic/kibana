/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meter } from '@opentelemetry/api';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type {
  ServiceAccountBoundWorkloadRef,
  ServiceAccountWorkloadResolver,
} from '@kbn/core-security-server';
import { WorkloadTypeRegistry } from './workload_type_registry';
import {
  buildWorkloadHref,
  createBoundWorkloadResolver,
  WORKLOAD_RESOLUTION_TIMEOUT_MS,
} from './resolve_bound_workloads';

const binding = (
  workloadId: string,
  overrides: Partial<ServiceAccountBoundWorkloadRef> = {}
): ServiceAccountBoundWorkloadRef => ({
  pluginId: 'workflows',
  workloadType: 'workflow',
  workloadId,
  spaceId: 'default',
  ...overrides,
});

const byId: ServiceAccountWorkloadResolver = async (workloads) =>
  workloads.map(({ workloadId }) => ({
    title: `Workflow ${workloadId}`,
    path: `/app/workflows/${workloadId}`,
  }));

describe('buildWorkloadHref', () => {
  it.each([
    ['', 'default', '/app/workflows/w-1', '/app/workflows/w-1'],
    ['', 'marketing', '/app/workflows/w-1', '/s/marketing/app/workflows/w-1'],
    ['/kbn', 'default', '/app/workflows/w-1', '/kbn/app/workflows/w-1'],
    ['/kbn', 'marketing', '/app/workflows/w-1', '/kbn/s/marketing/app/workflows/w-1'],
    ['/kbn/', 'marketing', '/app/workflows/w-1', '/kbn/s/marketing/app/workflows/w-1'],
    ['', 'default', '/app/workflows/', '/app/workflows/'],
    ['', 'default', '/app/workflows/w%201', '/app/workflows/w%201'],
    ['', 'default', '/app/workflows/w-1?from=..&to=../x', '/app/workflows/w-1?from=..&to=../x'],
    ['', 'default', '/app/workflows#/../../api', '/app/workflows#/../../api'],
  ])('with base path [%s] and space [%s], links %s as %s', (basePath, spaceId, path, href) => {
    expect(buildWorkloadHref(basePath, spaceId, path)).toBe(href);
  });

  it.each([
    // Not a plain app path.
    'app/workflows/w-1',
    '/api/status',
    '/application/x',
    '//evil.example/app/x',
    '/\\evil.example/app/x',
    'https://evil.example/app/x',
    'data:text/html,hello',
    '/app/work flows',
    '/app/work\nflows',
    '/app/work\tflows',
    '/app/work\u0000flows',
    '/app\\x',
    // Dot segments, literal or encoded.
    '/app/../api/status',
    '/app/%2e%2e/api/status',
    '/app/%2E%2E/api/status',
    '/app/.%2E/api/status',
    '/app/%2e./api/status',
    '/app/./workflows',
    '/app/%2e/workflows',
    '/app/workflows/..',
    '/app/x/../../../s/other/app/y',
    // Encoded separators and malformed escapes.
    '/app/%2f..%2fapi',
    '/app/%2F',
    '/app/%5c',
    '/app/%E0%A4%A',
    '/app/%',
    // Empty segments before the end.
    '/app//evil.example',
  ])('refuses the path %j', (path) => {
    expect(buildWorkloadHref('/kbn', 'marketing', path)).toBeUndefined();
  });

  it.each([undefined, null, 42, {}, ['/app/x']])('refuses a path that is not a string', (path) => {
    expect(buildWorkloadHref('', 'default', path)).toBeUndefined();
  });

  it.each(['', 'Marketing', '../default', 's/x', '*'])('refuses the space [%s]', (spaceId) => {
    expect(buildWorkloadHref('', spaceId, '/app/workflows/w-1')).toBeUndefined();
  });

  it('keeps every accepted link inside the base path, the space and /app/', () => {
    const paths = [
      '/app/workflows/w-1',
      '/app/workflows/a%20b',
      '/app/workflows/w-1?x=../../y',
      '/app/discover#/view/..%2F..',
    ];

    for (const path of paths) {
      const href = buildWorkloadHref('/kbn', 'marketing', path) ?? '';
      expect(new URL(href, 'http://kibana.invalid').pathname).toMatch(
        /^\/kbn\/s\/marketing\/app\//
      );
    }
  });
});

const DURATION = 'kibana.security.service_accounts.workload_resolution.duration';
const BATCH_SIZE = 'kibana.security.service_accounts.workload_resolution.batch.size';

/** A meter whose histograms record into jest mocks, keyed by metric name. */
const createMeterMock = () => {
  const histograms = new Map<string, { record: jest.Mock }>();
  const meter = {
    createHistogram: jest.fn((name: string) => {
      const histogram = { record: jest.fn() };
      histograms.set(name, histogram);
      return histogram;
    }),
  };
  const recorded = (name: string) => histograms.get(name)?.record.mock.calls ?? [];
  return { meter: meter as unknown as Meter, createHistogram: meter.createHistogram, recorded };
};

describe('createBoundWorkloadResolver', () => {
  let registry: WorkloadTypeRegistry;
  let logger: MockedLogger;
  let meterMock: ReturnType<typeof createMeterMock>;

  const createResolver = (timeoutMs?: number) =>
    createBoundWorkloadResolver({
      registry,
      serverBasePath: '',
      logger,
      timeoutMs,
      meter: meterMock.meter,
    });

  beforeEach(() => {
    registry = new WorkloadTypeRegistry();
    logger = loggerMock.create();
    meterMock = createMeterMock();
  });

  describe('metrics', () => {
    const workflowAttributes = {
      'kibana.plugin.id': 'workflows',
      'kibana.service_account.workload.type': 'workflow',
    };

    it('creates its histograms once, not on every call', async () => {
      registry.register('workflows', {
        type: 'workflow',
        name: 'Workflow',
        resolveWorkloads: byId,
      });
      const resolve = createResolver();

      await resolve([binding('w-1')]);
      await resolve([binding('w-2')]);

      expect(meterMock.createHistogram).toHaveBeenCalledTimes(2);
      expect(meterMock.createHistogram.mock.calls.map(([name]) => name)).toEqual([
        DURATION,
        BATCH_SIZE,
      ]);
    });

    it('records the batch size and duration of each resolver call by plugin and type', async () => {
      registry.register('workflows', {
        type: 'workflow',
        name: 'Workflow',
        resolveWorkloads: byId,
      });
      registry.register('alerting', { type: 'rule', name: 'Rule', resolveWorkloads: byId });

      await createResolver()([
        binding('w-1'),
        binding('w-2', { spaceId: 'marketing' }),
        binding('r-1', { pluginId: 'alerting', workloadType: 'rule' }),
      ]);

      const ruleAttributes = {
        'kibana.plugin.id': 'alerting',
        'kibana.service_account.workload.type': 'rule',
      };
      expect(meterMock.recorded(BATCH_SIZE)).toEqual([
        [2, workflowAttributes],
        [1, ruleAttributes],
      ]);
      expect(meterMock.recorded(DURATION)).toEqual([
        [expect.any(Number), workflowAttributes],
        [expect.any(Number), ruleAttributes],
      ]);
      for (const [seconds] of meterMock.recorded(DURATION)) {
        expect(seconds).toBeGreaterThanOrEqual(0);
        expect(seconds).toBeLessThan(WORKLOAD_RESOLUTION_TIMEOUT_MS / 1000);
      }
    });

    it.each([
      [
        'an error',
        async () => {
          throw new Error('boom');
        },
        '_OTHER',
      ],
      ['an unexpected result', async () => [], 'invalid_result'],
    ])('records the error type when a resolver returns %s', async (_, resolveWorkloads, type) => {
      registry.register('workflows', {
        type: 'workflow',
        name: 'Workflow',
        resolveWorkloads: resolveWorkloads as ServiceAccountWorkloadResolver,
      });

      await createResolver()([binding('w-1')]);

      expect(meterMock.recorded(DURATION)).toEqual([
        [expect.any(Number), { ...workflowAttributes, 'error.type': type }],
      ]);
    });

    it('records no call for types without a resolver', async () => {
      registry.register('alerting', { type: 'rule', name: 'Rule' });

      await createResolver()([binding('r-1', { pluginId: 'alerting', workloadType: 'rule' })]);

      expect(meterMock.recorded(DURATION)).toEqual([]);
      expect(meterMock.recorded(BATCH_SIZE)).toEqual([]);
    });
  });

  it('calls no resolver for no bindings', async () => {
    const resolveWorkloads = jest.fn(byId);
    registry.register('workflows', { type: 'workflow', name: 'Workflow', resolveWorkloads });

    await expect(createResolver()([])).resolves.toEqual([]);
    expect(resolveWorkloads).not.toHaveBeenCalled();
  });

  it('returns empty entries for types that are not registered or have no resolver', async () => {
    registry.register('alerting', { type: 'rule', name: 'Rule' });

    await expect(
      createResolver()([
        binding('r-1', { pluginId: 'alerting', workloadType: 'rule' }),
        binding('x-1', { pluginId: 'unknown', workloadType: 'job' }),
      ])
    ).resolves.toEqual([{}, {}]);
  });

  it('calls each resolver once per plugin and type, and keeps the order of the bindings', async () => {
    const workflows = jest.fn(byId);
    const alertingRules = jest.fn<
      ReturnType<ServiceAccountWorkloadResolver>,
      Parameters<ServiceAccountWorkloadResolver>
    >(async (workloads) =>
      workloads.map(({ workloadId }) => ({
        title: `Rule ${workloadId}`,
        path: `/app/rules/${workloadId}`,
      }))
    );
    const otherRules = jest.fn(async () => [{ title: 'Other rule' }]);
    registry.register('workflows', {
      type: 'workflow',
      name: 'Workflow',
      resolveWorkloads: workflows,
    });
    registry.register('alerting', { type: 'rule', name: 'Rule', resolveWorkloads: alertingRules });
    registry.register('other', { type: 'rule', name: 'Rule', resolveWorkloads: otherRules });

    const result = await createResolver()([
      binding('w-1'),
      binding('r-1', { pluginId: 'alerting', workloadType: 'rule', spaceId: 'marketing' }),
      binding('w-2', { spaceId: 'marketing' }),
      binding('o-1', { pluginId: 'other', workloadType: 'rule' }),
      binding('r-2', { pluginId: 'alerting', workloadType: 'rule' }),
    ]);

    expect(result).toEqual([
      { title: 'Workflow w-1', href: '/app/workflows/w-1' },
      { title: 'Rule r-1', href: '/s/marketing/app/rules/r-1' },
      { title: 'Workflow w-2', href: '/s/marketing/app/workflows/w-2' },
      { title: 'Other rule' },
      { title: 'Rule r-2', href: '/app/rules/r-2' },
    ]);
    expect(workflows).toHaveBeenCalledTimes(1);
    expect(workflows).toHaveBeenCalledWith(
      [
        { workloadId: 'w-1', spaceId: 'default' },
        { workloadId: 'w-2', spaceId: 'marketing' },
      ],
      { signal: expect.any(AbortSignal) }
    );
    expect(alertingRules).toHaveBeenCalledTimes(1);
    expect(alertingRules.mock.calls[0][0]).toEqual([
      { workloadId: 'r-1', spaceId: 'marketing' },
      { workloadId: 'r-2', spaceId: 'default' },
    ]);
    expect(otherRules).toHaveBeenCalledTimes(1);
  });

  it('builds links under the server base path', async () => {
    registry.register('workflows', { type: 'workflow', name: 'Workflow', resolveWorkloads: byId });
    const resolve = createBoundWorkloadResolver({ registry, serverBasePath: '/kbn', logger });

    await expect(
      resolve([binding('w-1'), binding('w-2', { spaceId: 'marketing' })])
    ).resolves.toEqual([
      { title: 'Workflow w-1', href: '/kbn/app/workflows/w-1' },
      { title: 'Workflow w-2', href: '/kbn/s/marketing/app/workflows/w-2' },
    ]);
  });

  it('keeps a title that comes without a path', async () => {
    registry.register('workflows', {
      type: 'workflow',
      name: 'Workflow',
      resolveWorkloads: async () => [{ title: 'Nightly report' }],
    });

    await expect(createResolver()([binding('w-1')])).resolves.toEqual([
      { title: 'Nightly report' },
    ]);
  });

  it('drops blank and non-string titles', async () => {
    registry.register('workflows', {
      type: 'workflow',
      name: 'Workflow',
      resolveWorkloads: async () =>
        [{ title: '  ', path: '/app/workflows/w-1' }, { title: 42 }, undefined] as never,
    });

    await expect(
      createResolver()([binding('w-1'), binding('w-2'), binding('w-3')])
    ).resolves.toEqual([{ href: '/app/workflows/w-1' }, {}, {}]);
  });

  it('discards the whole entry, title included, when the path cannot be linked to', async () => {
    registry.register('workflows', {
      type: 'workflow',
      name: 'Workflow',
      resolveWorkloads: async () => [
        { title: 'Escapes the app', path: '/app/../api/status' },
        { title: 'Encoded escape', path: '/app/%2e%2e/api/status' },
        { title: 'Fine', path: '/app/workflows/w-3' },
        { title: 'Absolute', path: 'https://evil.example/' },
      ],
    });

    await expect(
      createResolver()([binding('w-1'), binding('w-2'), binding('w-3'), binding('w-4')])
    ).resolves.toEqual([{}, {}, { title: 'Fine', href: '/app/workflows/w-3' }, {}]);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toMatchInlineSnapshot(
      `"Workload type [workflow] registered by plugin [workflows] returned 3 path(s) that are not plain /app/ paths, ignoring those workloads."`
    );
  });

  it('discards an entry whose binding has an invalid space', async () => {
    registry.register('workflows', { type: 'workflow', name: 'Workflow', resolveWorkloads: byId });

    await expect(createResolver()([binding('w-1', { spaceId: 'Not A Space' })])).resolves.toEqual([
      {},
    ]);
  });

  describe('when a resolver fails', () => {
    const goodBindings = [binding('w-1'), binding('w-2', { spaceId: 'marketing' })];
    const goodResults = [
      { title: 'Workflow w-1', href: '/app/workflows/w-1' },
      { title: 'Workflow w-2', href: '/s/marketing/app/workflows/w-2' },
    ];

    beforeEach(() => {
      registry.register('workflows', {
        type: 'workflow',
        name: 'Workflow',
        resolveWorkloads: byId,
      });
    });

    it.each([
      [
        'throws synchronously',
        (() => {
          throw new Error('boom');
        }) as unknown as ServiceAccountWorkloadResolver,
        'Unable to resolve 1 workload(s) of type [rule] registered by plugin [alerting]: boom',
      ],
      [
        'rejects',
        async () => {
          throw new Error('boom');
        },
        'Unable to resolve 1 workload(s) of type [rule] registered by plugin [alerting]: boom',
      ],
      [
        'rejects with undefined',
        jest.fn().mockRejectedValue(undefined),
        'Unable to resolve 1 workload(s) of type [rule] registered by plugin [alerting]: undefined',
      ],
      [
        'rejects with null',
        jest.fn().mockRejectedValue(null),
        'Unable to resolve 1 workload(s) of type [rule] registered by plugin [alerting]: null',
      ],
      [
        'returns too few entries',
        async () => [],
        'Workload type [rule] registered by plugin [alerting] returned an unexpected result for 1 workload(s), ignoring it.',
      ],
      [
        'returns something other than an array',
        async () => ({ title: 'x' } as never),
        'Workload type [rule] registered by plugin [alerting] returned an unexpected result for 1 workload(s), ignoring it.',
      ],
    ])('falls back for that type only when it %s', async (_, resolveWorkloads, message) => {
      registry.register('alerting', { type: 'rule', name: 'Rule', resolveWorkloads });

      await expect(
        createResolver()([
          goodBindings[0],
          binding('r-1', { pluginId: 'alerting', workloadType: 'rule' }),
          goodBindings[1],
        ])
      ).resolves.toEqual([goodResults[0], {}, goodResults[1]]);
      expect(logger.warn).toHaveBeenCalledWith(message);
    });

    describe('on timeout', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('gives up after ten seconds', () => {
        expect(WORKLOAD_RESOLUTION_TIMEOUT_MS).toBe(10_000);
      });

      it('aborts the signal, falls back for that type only, and ignores a late answer', async () => {
        let signal: AbortSignal | undefined;
        let answer: (details: Array<{ title: string; path: string }>) => void = () => {};
        registry.register('alerting', {
          type: 'rule',
          name: 'Rule',
          resolveWorkloads: (workloads, options) => {
            signal = options.signal;
            return new Promise((resolve) => {
              answer = resolve;
            });
          },
        });

        const pending = createResolver()([
          goodBindings[0],
          binding('r-1', { pluginId: 'alerting', workloadType: 'rule' }),
          goodBindings[1],
        ]);

        await jest.advanceTimersByTimeAsync(WORKLOAD_RESOLUTION_TIMEOUT_MS - 1);
        expect(signal?.aborted).toBe(false);

        await jest.advanceTimersByTimeAsync(1);
        const result = await pending;

        expect(signal?.aborted).toBe(true);
        expect(result).toEqual([goodResults[0], {}, goodResults[1]]);
        expect(logger.warn).toHaveBeenCalledWith(
          `Unable to resolve 1 workload(s) of type [rule] registered by plugin [alerting]: Timed out after ${WORKLOAD_RESOLUTION_TIMEOUT_MS}ms.`
        );
        expect(meterMock.recorded(DURATION)).toContainEqual([
          WORKLOAD_RESOLUTION_TIMEOUT_MS / 1000,
          {
            'kibana.plugin.id': 'alerting',
            'kibana.service_account.workload.type': 'rule',
            'error.type': 'timeout',
          },
        ]);

        answer([{ title: 'Late', path: '/app/rules/r-1' }]);
        await jest.advanceTimersByTimeAsync(0);

        expect(result).toEqual([goodResults[0], {}, goodResults[1]]);
      });

      it('clears its timer once the resolver answers', async () => {
        const pending = createResolver()(goodBindings);
        await jest.advanceTimersByTimeAsync(0);

        await expect(pending).resolves.toEqual(goodResults);
        expect(jest.getTimerCount()).toBe(0);
      });
    });
  });
});
