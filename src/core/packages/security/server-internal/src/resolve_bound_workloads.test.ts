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
    status: 'present',
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
    // Not an app path.
    'app/workflows/w-1',
    '/api/status',
    '/application/x',
    '//evil.example/app/x',
    '/\\evil.example/app/x',
    'https://evil.example/app/x',
    'data:text/html,hello',
    // Whitespace, control characters and backslashes.
    '/app/work flows',
    '/app/work\nflows',
    '/app/work\tflows',
    '/app/work\u0000flows',
    '/app\\x',
    // Dot segments, literal or encoded, that climb out of the app or the space.
    '/app/..',
    '/app/../api/status',
    '/app/%2e%2e/api/status',
    '/app/%2E%2E/api/status',
    '/app/.%2E/api/status',
    '/app/%2e./api/status',
    '/app/x/../../../s/other/app/y',
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
      // Odd, but a URL parser keeps all of these under /app.
      '/app/./workflows',
      '/app/%2e/workflows',
      '/app/workflows/..',
      '/app/foo/../workflows/w-1',
      '/app/%2f..%2fapi',
      '/app/%5c..%5capi',
      '/app/%E0%A4%A',
      '/app//evil.example',
    ];

    for (const path of paths) {
      const href = buildWorkloadHref('/kbn', 'marketing', path);
      expect(href).toBe(`/kbn/s/marketing${path}`);
      expect(new URL(href ?? '', 'http://kibana.invalid').pathname).toMatch(
        /^\/kbn\/s\/marketing\/app\//
      );
    }
  });
});

const DURATION = 'kibana.security.service_accounts.workload_resolution.duration';
const BATCH_SIZE = 'kibana.security.service_accounts.workload_resolution.batch.size';
const UNKNOWN = 'kibana.security.service_accounts.workload_resolution.unknown';

/** A meter whose histograms and counters record into jest mocks, keyed by metric name. */
const createMeterMock = () => {
  const histograms = new Map<string, { record: jest.Mock }>();
  const counters = new Map<string, { add: jest.Mock }>();
  const meter = {
    createHistogram: jest.fn((name: string) => {
      const histogram = { record: jest.fn() };
      histograms.set(name, histogram);
      return histogram;
    }),
    createCounter: jest.fn((name: string) => {
      const counter = { add: jest.fn() };
      counters.set(name, counter);
      return counter;
    }),
  };
  const recorded = (name: string) =>
    histograms.get(name)?.record.mock.calls ?? counters.get(name)?.add.mock.calls ?? [];
  return {
    meter: meter as unknown as Meter,
    createHistogram: meter.createHistogram,
    createCounter: meter.createCounter,
    recorded,
  };
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
      'kibana.service_account.workload_resolution.purpose': 'display',
    };

    it('creates its instruments once, not on every call', async () => {
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
      expect(meterMock.createCounter.mock.calls.map(([name]) => name)).toEqual([UNKNOWN]);
    });

    it('records the purpose the caller gave', async () => {
      registry.register('workflows', {
        type: 'workflow',
        name: 'Workflow',
        resolveWorkloads: byId,
      });

      await createResolver()([binding('w-1')], { purpose: 'cleanup' });

      expect(meterMock.recorded(BATCH_SIZE)).toEqual([
        [
          1,
          {
            ...workflowAttributes,
            'kibana.service_account.workload_resolution.purpose': 'cleanup',
          },
        ],
      ]);
    });

    it('counts the workloads a resolver answered unknown', async () => {
      registry.register('workflows', {
        type: 'workflow',
        name: 'Workflow',
        resolveWorkloads: async () => [
          { status: 'unknown' },
          { status: 'missing' },
          { status: 'unknown' },
        ],
      });

      await createResolver()([binding('w-1'), binding('w-2'), binding('w-3')]);

      expect(meterMock.recorded(UNKNOWN)).toEqual([[2, workflowAttributes]]);
      expect(meterMock.recorded(DURATION)).toEqual([[expect.any(Number), workflowAttributes]]);
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
        'kibana.service_account.workload_resolution.purpose': 'display',
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
      ['an invalid status', async () => [{ status: 'gone' }], 'invalid_result'],
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
      expect(meterMock.recorded(UNKNOWN)).toEqual([
        [1, { ...workflowAttributes, 'error.type': type }],
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

  it('answers unknown for types that are not registered or have no resolver', async () => {
    registry.register('alerting', { type: 'rule', name: 'Rule' });

    await expect(
      createResolver()([
        binding('r-1', { pluginId: 'alerting', workloadType: 'rule' }),
        binding('x-1', { pluginId: 'unknown', workloadType: 'job' }),
      ])
    ).resolves.toEqual([{ status: 'unknown' }, { status: 'unknown' }]);
  });

  it('passes missing and unknown through for each workload', async () => {
    registry.register('workflows', {
      type: 'workflow',
      name: 'Workflow',
      resolveWorkloads: async () => [
        { status: 'missing' },
        { status: 'present', title: 'Kept' },
        { status: 'unknown' },
      ],
    });

    await expect(
      createResolver()([binding('w-1'), binding('w-2'), binding('w-3')])
    ).resolves.toEqual([
      { status: 'missing' },
      { status: 'present', title: 'Kept' },
      { status: 'unknown' },
    ]);
  });

  it.each([
    ['an entry without a status', [{ status: 'present' }, { title: 'No status' }]],
    ['an entry with an invalid status', [{ status: 'present' }, { status: 'deleted' }]],
    ['an undefined entry', [{ status: 'present' }, undefined]],
    ['a null entry', [{ status: 'present' }, null]],
  ])('answers unknown for the whole batch when a resolver returns %s', async (_, details) => {
    registry.register('workflows', {
      type: 'workflow',
      name: 'Workflow',
      resolveWorkloads: async () => details as never,
    });

    await expect(createResolver()([binding('w-1'), binding('w-2')])).resolves.toEqual([
      { status: 'unknown' },
      { status: 'unknown' },
    ]);
    expect(logger.warn).toHaveBeenCalledWith(
      'Workload type [workflow] registered by plugin [workflows] returned an unexpected result for 2 workload(s), ignoring it.'
    );
  });

  it('calls each resolver once per plugin and type, and keeps the order of the bindings', async () => {
    const workflows = jest.fn(byId);
    const alertingRules = jest.fn<
      ReturnType<ServiceAccountWorkloadResolver>,
      Parameters<ServiceAccountWorkloadResolver>
    >(async (workloads) =>
      workloads.map(({ workloadId }) => ({
        status: 'present',
        title: `Rule ${workloadId}`,
        path: `/app/rules/${workloadId}`,
      }))
    );
    const otherRules = jest.fn(async () => [{ status: 'present' as const, title: 'Other rule' }]);
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
      { status: 'present', title: 'Workflow w-1', href: '/app/workflows/w-1' },
      { status: 'present', title: 'Rule r-1', href: '/s/marketing/app/rules/r-1' },
      { status: 'present', title: 'Workflow w-2', href: '/s/marketing/app/workflows/w-2' },
      { status: 'present', title: 'Other rule' },
      { status: 'present', title: 'Rule r-2', href: '/app/rules/r-2' },
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
      { status: 'present', title: 'Workflow w-1', href: '/kbn/app/workflows/w-1' },
      { status: 'present', title: 'Workflow w-2', href: '/kbn/s/marketing/app/workflows/w-2' },
    ]);
  });

  it('keeps a title that comes without a path', async () => {
    registry.register('workflows', {
      type: 'workflow',
      name: 'Workflow',
      resolveWorkloads: async () => [{ status: 'present', title: 'Nightly report' }],
    });

    await expect(createResolver()([binding('w-1')])).resolves.toEqual([
      { status: 'present', title: 'Nightly report' },
    ]);
  });

  it('drops blank and non-string titles', async () => {
    registry.register('workflows', {
      type: 'workflow',
      name: 'Workflow',
      resolveWorkloads: async () =>
        [
          { status: 'present', title: '  ', path: '/app/workflows/w-1' },
          { status: 'present', title: 42 },
        ] as never,
    });

    await expect(createResolver()([binding('w-1'), binding('w-2')])).resolves.toEqual([
      { status: 'present', href: '/app/workflows/w-1' },
      { status: 'present' },
    ]);
  });

  it('drops the title and the link, but keeps the status, when the path cannot be linked to', async () => {
    registry.register('workflows', {
      type: 'workflow',
      name: 'Workflow',
      resolveWorkloads: async () => [
        { status: 'present', title: 'Escapes the app', path: '/app/../api/status' },
        { status: 'present', title: 'Encoded escape', path: '/app/%2e%2e/api/status' },
        { status: 'present', title: 'Fine', path: '/app/workflows/w-3' },
        { status: 'present', title: 'Absolute', path: 'https://evil.example/' },
      ],
    });

    await expect(
      createResolver()([binding('w-1'), binding('w-2'), binding('w-3'), binding('w-4')])
    ).resolves.toEqual([
      { status: 'present' },
      { status: 'present' },
      { status: 'present', title: 'Fine', href: '/app/workflows/w-3' },
      { status: 'present' },
    ]);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toMatchInlineSnapshot(
      `"Workload type [workflow] registered by plugin [workflows] returned 3 path(s) that Core cannot link to, showing those workloads without a title or a link."`
    );
  });

  it('keeps only the status of an entry whose binding has an invalid space', async () => {
    registry.register('workflows', { type: 'workflow', name: 'Workflow', resolveWorkloads: byId });

    await expect(createResolver()([binding('w-1', { spaceId: 'Not A Space' })])).resolves.toEqual([
      { status: 'present' },
    ]);
  });

  describe('when the caller aborts', () => {
    it('calls no resolver when the signal is already aborted', async () => {
      const resolveWorkloads = jest.fn(byId);
      registry.register('workflows', { type: 'workflow', name: 'Workflow', resolveWorkloads });
      const controller = new AbortController();
      controller.abort();

      await expect(
        createResolver()([binding('w-1')], { signal: controller.signal })
      ).resolves.toEqual([{ status: 'unknown' }]);
      expect(resolveWorkloads).not.toHaveBeenCalled();
    });

    it('aborts the resolver signal, answers unknown and ignores a late answer', async () => {
      let resolverSignal: AbortSignal | undefined;
      let answer: (details: Array<{ status: 'missing' }>) => void = () => {};
      registry.register('workflows', {
        type: 'workflow',
        name: 'Workflow',
        resolveWorkloads: (workloads, options) => {
          resolverSignal = options.signal;
          return new Promise((resolve) => {
            answer = resolve;
          });
        },
      });
      const controller = new AbortController();

      const pending = createResolver()([binding('w-1')], { signal: controller.signal });
      await Promise.resolve();
      controller.abort();
      const result = await pending;

      expect(resolverSignal?.aborted).toBe(true);
      expect(result).toEqual([{ status: 'unknown' }]);
      expect(meterMock.recorded(UNKNOWN)).toEqual([
        [
          1,
          {
            'kibana.plugin.id': 'workflows',
            'kibana.service_account.workload.type': 'workflow',
            'kibana.service_account.workload_resolution.purpose': 'display',
            'error.type': 'aborted',
          },
        ],
      ]);

      answer([{ status: 'missing' }]);
      await Promise.resolve();
      expect(result).toEqual([{ status: 'unknown' }]);
    });
  });

  describe('when a resolver fails', () => {
    const goodBindings = [binding('w-1'), binding('w-2', { spaceId: 'marketing' })];
    const goodResults = [
      { status: 'present', title: 'Workflow w-1', href: '/app/workflows/w-1' },
      { status: 'present', title: 'Workflow w-2', href: '/s/marketing/app/workflows/w-2' },
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
        async () => ({ status: 'present' } as never),
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
      ).resolves.toEqual([goodResults[0], { status: 'unknown' }, goodResults[1]]);
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
        let answer: (details: Array<{ status: 'missing' }>) => void = () => {};
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
        expect(result).toEqual([goodResults[0], { status: 'unknown' }, goodResults[1]]);
        expect(logger.warn).toHaveBeenCalledWith(
          `Unable to resolve 1 workload(s) of type [rule] registered by plugin [alerting]: Timed out after ${WORKLOAD_RESOLUTION_TIMEOUT_MS}ms.`
        );
        expect(meterMock.recorded(DURATION)).toContainEqual([
          WORKLOAD_RESOLUTION_TIMEOUT_MS / 1000,
          {
            'kibana.plugin.id': 'alerting',
            'kibana.service_account.workload.type': 'rule',
            'kibana.service_account.workload_resolution.purpose': 'display',
            'error.type': 'timeout',
          },
        ]);

        answer([{ status: 'missing' }]);
        await jest.advanceTimersByTimeAsync(0);

        expect(result).toEqual([goodResults[0], { status: 'unknown' }, goodResults[1]]);
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
