/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { HousekeepingRegistry } from './registry';
import { runHousekeeping, selectProviders } from './run';
import { indicesProvider, pipelinesProvider } from './test_helpers';
import type { HousekeepingCheck, HousekeepingContext, HousekeepingResourceProvider } from './types';

const policiesProvider = (
  overrides: Partial<HousekeepingResourceProvider> = {}
): HousekeepingResourceProvider => ({
  id: 'policies',
  title: 'Policies',
  resourceTypes: [{ id: 'policy', label: 'Policy' }],
  listResources: async () => [],
  ...overrides,
});

const createCheck = (overrides: Partial<HousekeepingCheck> = {}): HousekeepingCheck => ({
  id: 'retention',
  title: 'No retention',
  description: 'No retention',
  resourceTypes: ['index'],
  run: async () => [],
  ...overrides,
});

const run = (
  {
    providers = [],
    checks = [],
  }: { providers?: HousekeepingResourceProvider[]; checks?: HousekeepingCheck[] },
  options: Partial<Parameters<typeof runHousekeeping>[0]> = {}
) => {
  const registry = new HousekeepingRegistry();
  providers.forEach((provider) => registry.registerResourceProvider(provider));
  checks.forEach((check) => registry.registerCheck(check));
  return runHousekeeping({
    registry,
    context: {
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      savedObjectsClient: savedObjectsClientMock.create(),
      isServerless: false,
      logger: loggingSystemMock.createLogger(),
    },
    abortSignal: new AbortController().signal,
    ...options,
  });
};

describe('selectProviders', () => {
  const indices = indicesProvider({ referencedTypes: ['pipeline', 'policy'] });
  const pipelines = pipelinesProvider();
  const policies = policiesProvider();

  it('selects every provider without a scope', () => {
    expect(selectProviders([indices, pipelines, policies])).toEqual([indices, pipelines, policies]);
  });

  it('adds the providers that reference the scope and the owners of their targets', () => {
    expect(selectProviders([indices, pipelines, policies], ['pipeline'])).toEqual([
      indices,
      pipelines,
      policies,
    ]);
  });

  it('adds the providers that reference the types owned by the scope', () => {
    expect(selectProviders([indices, pipelines, policies], ['policy'])).toEqual([
      indices,
      pipelines,
      policies,
    ]);
    expect(selectProviders([pipelines, policies], ['policy'])).toEqual([policies]);
  });
});

describe('runHousekeeping', () => {
  it('combines graph and check findings, sorted by kind, with the resource types', async () => {
    const result = await run({
      providers: [
        indicesProvider({
          listResources: async () => [
            {
              type: 'index',
              id: 'logs',
              references: [
                { targetType: 'pipeline', targetId: 'gone', via: 'index.default_pipeline' },
              ],
            },
          ],
        }),
        pipelinesProvider(),
      ],
      checks: [
        createCheck({
          run: async () => [{ resource: { type: 'index', id: 'logs' }, related: [] }],
        }),
      ],
    });

    expect(result.groups.map(({ id, kind }) => [id, kind])).toEqual([
      ['broken_reference:pipeline', 'broken_reference'],
      ['retention', 'risk'],
    ]);
    expect(result.summary).toEqual({ broken_reference: 1, deprecation: 0, unused: 0, risk: 1 });
    expect(result.kinds).toEqual(['broken_reference', 'risk', 'unused']);
    expect(result.resourceTypes).toEqual({
      index: { label: 'Index' },
      pipeline: { label: 'Pipeline' },
    });
  });

  it('does not report findings on managed resources', async () => {
    const result = await run({
      providers: [
        indicesProvider({
          listResources: async () => [
            {
              type: 'index',
              id: '.fleet-logs',
              isManaged: true,
              references: [
                { targetType: 'pipeline', targetId: 'gone', via: 'index.default_pipeline' },
              ],
            },
          ],
        }),
        pipelinesProvider(),
      ],
    });

    expect(result.groups).toEqual([]);
  });

  it('reports failed and timed out providers and checks without losing the rest', async () => {
    const result = await run(
      {
        providers: [
          pipelinesProvider({
            listResources: async () => {
              throw new Error('security_exception');
            },
          }),
        ],
        checks: [createCheck({ run: () => new Promise(() => {}) })],
      },
      { timeoutMs: 10 }
    );

    expect(result.skipped).toEqual([
      {
        checkId: 'pipelines',
        checkTitle: 'Pipelines',
        reason: 'error',
        message: 'security_exception',
      },
      {
        checkId: 'retention',
        checkTitle: 'No retention',
        reason: 'timeout',
        message: 'Did not finish within 10ms',
      },
    ]);
  });

  it('reports a provider that throws before returning a promise, without failing the run', async () => {
    const result = await run({
      providers: [
        pipelinesProvider({
          listResources: () => {
            throw new Error('not configured');
          },
        }),
      ],
    });

    expect(result.skipped).toEqual([
      { checkId: 'pipelines', checkTitle: 'Pipelines', reason: 'error', message: 'not configured' },
    ]);
  });

  it('aborts the requests of a provider that times out', async () => {
    let signal: AbortSignal | undefined;
    await run(
      {
        providers: [
          pipelinesProvider({
            listResources: ({ abortSignal }) => {
              signal = abortSignal;
              return new Promise(() => {});
            },
          }),
        ],
      },
      { timeoutMs: 10 }
    );

    expect(signal?.aborted).toBe(true);
  });

  it('leaves out a provider whose availability throws', async () => {
    const listResources = jest.fn(async () => []);
    await run({
      providers: [
        pipelinesProvider({
          isAvailable: () => {
            throw new Error('no license');
          },
          listResources,
        }),
      ],
    });

    expect(listResources).not.toHaveBeenCalled();
  });

  it('does not run unavailable providers or checks out of scope', async () => {
    const listResources = jest.fn(async () => []);
    const check = createCheck({ run: jest.fn(async () => []) });

    await run(
      {
        providers: [pipelinesProvider({ isAvailable: () => false, listResources })],
        checks: [check],
      },
      { scope: { resourceTypes: ['pipeline'] } }
    );

    expect(listResources).not.toHaveBeenCalled();
    expect(check.run).not.toHaveBeenCalled();
  });

  it('shares fetchOnce responses between providers', async () => {
    const fetch = jest.fn(async () => ({}));
    const listResources = async ({ fetchOnce }: HousekeepingContext) => {
      await fetchOnce('templates', fetch);
      return [];
    };

    await run({
      providers: [indicesProvider({ listResources }), pipelinesProvider({ listResources })],
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('gives fetchOnce the signal of the run, so a caller that times out does not abort it', async () => {
    let shared: AbortSignal | undefined;
    let sharedAbortedOnTimeout: boolean | undefined;
    await run(
      {
        providers: [
          pipelinesProvider({
            listResources: ({ abortSignal, fetchOnce }) => {
              fetchOnce('slow', (signal) => {
                shared = signal;
                return new Promise(() => {});
              });
              abortSignal.addEventListener('abort', () => {
                sharedAbortedOnTimeout = shared?.aborted;
              });
              return new Promise(() => {});
            },
          }),
        ],
      },
      { timeoutMs: 10 }
    );

    expect(sharedAbortedOnTimeout).toBe(false);
    // The run is over, so nothing else can use the response.
    expect(shared?.aborted).toBe(true);
  });

  it('reports only the kinds that the providers and checks of the run can report', async () => {
    const graphOnly = await run({ providers: [pipelinesProvider()] });
    const deprecations = await run({
      checks: [createCheck({ id: 'old_indices', kind: 'deprecation' })],
    });

    expect(graphOnly.kinds).toEqual(['broken_reference', 'unused']);
    expect(deprecations.kinds).toEqual(['deprecation']);
  });
});
