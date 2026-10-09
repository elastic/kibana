/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SubscriptionCacheGroup } from './subscription_resolution_cache';
import { SubscriptionResolutionCache } from './subscription_resolution_cache';

const groups = (workflowIds: string[], condition = 'host.name: a'): SubscriptionCacheGroup[] => [
  { condition, workflowIds },
];

const retainedGenerations = (cache: SubscriptionResolutionCache): number =>
  (cache as unknown as { generations: Map<string, number> }).generations.size;

const createCache = (
  overrides: { ttlMs?: number; maxEntries?: number; now?: () => number } = {}
): { cache: SubscriptionResolutionCache; now: { value: number } } => {
  const now = { value: 1_000 };
  const cache = new SubscriptionResolutionCache({
    ttlMs: overrides.ttlMs ?? 60_000,
    maxEntries: overrides.maxEntries,
    now: overrides.now ?? (() => now.value),
  });
  return { cache, now };
};

describe('SubscriptionResolutionCache', () => {
  it('does not call the loader again while the entry is unexpired', async () => {
    const { cache } = createCache();
    const fetchGroups = jest.fn(async () => groups(['1', '2']));

    const first = await cache.load('default', 'alert.fired', fetchGroups);
    const second = await cache.load('default', 'alert.fired', fetchGroups);

    expect(fetchGroups).toHaveBeenCalledTimes(1);
    expect(first.outcome).toBe('miss');
    expect(second.outcome).toBe('hit');
    expect(second.entry.groups).toEqual(groups(['1', '2']));
    expect(second.entry.expiresAt).toBe(first.entry.expiresAt);
  });

  it('does not move expiresAt when the entry is read again', async () => {
    const { cache, now } = createCache();
    await cache.load('default', 'alert.fired', async () => groups(['1']));

    const before = cache.read('default', 'alert.fired');
    now.value += 5_000;
    const after = cache.read('default', 'alert.fired');

    expect(after?.expiresAt).toBe(before?.expiresAt);
  });

  it('drops an expired entry on read and loads again', async () => {
    const { cache, now } = createCache({ ttlMs: 1_000 });
    await cache.load('default', 'alert.fired', async () => groups(['1']));
    now.value += 1_000;

    expect(cache.read('default', 'alert.fired')).toBeUndefined();

    const fetchGroups = jest.fn(async () => groups(['2']));
    const reloaded = await cache.load('default', 'alert.fired', fetchGroups);

    expect(fetchGroups).toHaveBeenCalledTimes(1);
    expect(reloaded.outcome).toBe('miss');
    expect(reloaded.entry.groups).toEqual(groups(['2']));
  });

  it('keeps separate entries for the same trigger in different spaces', async () => {
    const { cache } = createCache();
    await cache.load('space-a', 'alert.fired', async () => groups(['a']));
    await cache.load('space-b', 'alert.fired', async () => groups(['b'], 'process.name: b'));

    expect(cache.read('space-a', 'alert.fired')?.groups).toEqual(groups(['a']));
    expect(cache.read('space-b', 'alert.fired')?.groups).toEqual(groups(['b'], 'process.name: b'));
  });

  it('caches an empty subscriber set', async () => {
    const { cache } = createCache();
    const fetchGroups = jest.fn(async () => []);

    await cache.load('default', 'alert.fired', fetchGroups);
    const second = await cache.load('default', 'alert.fired', fetchGroups);

    expect(fetchGroups).toHaveBeenCalledTimes(1);
    expect(second.outcome).toBe('hit');
    expect(second.entry.groups).toEqual([]);
  });

  it('shares one load across concurrent misses', async () => {
    const { cache } = createCache();
    let release: (value: SubscriptionCacheGroup[]) => void = () => {};
    const gate = new Promise<SubscriptionCacheGroup[]>((resolve) => {
      release = resolve;
    });
    const fetchGroups = jest.fn(() => gate);

    const first = cache.load('default', 'alert.fired', fetchGroups);
    const second = cache.load('default', 'alert.fired', fetchGroups);
    release(groups(['1']));

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(fetchGroups).toHaveBeenCalledTimes(1);
    expect(firstResult.outcome).toBe('miss');
    expect(secondResult.outcome).toBe('miss');
    expect(firstResult.entry.groups).toEqual(groups(['1']));
    expect(cache.read('default', 'alert.fired')?.groups).toEqual(groups(['1']));
  });

  it('does not store a load that was invalidated while in flight', async () => {
    const { cache } = createCache();
    let release: (value: SubscriptionCacheGroup[]) => void = () => {};
    const gate = new Promise<SubscriptionCacheGroup[]>((resolve) => {
      release = resolve;
    });
    const staleFetch = jest.fn(() => gate);

    const inflight = cache.load('default', 'alert.fired', staleFetch);
    cache.invalidate({ spaceId: 'default', triggerIds: ['alert.fired'] });
    release(groups(['stale']));
    const staleResult = await inflight;

    expect(staleResult.entry.groups).toEqual(groups(['stale']));
    expect(cache.read('default', 'alert.fired')).toBeUndefined();

    const freshFetch = jest.fn(async () => groups(['fresh']));
    const fresh = await cache.load('default', 'alert.fired', freshFetch);

    expect(freshFetch).toHaveBeenCalledTimes(1);
    expect(fresh.entry.groups).toEqual(groups(['fresh']));
    expect(cache.read('default', 'alert.fired')?.groups).toEqual(groups(['fresh']));
  });

  it('does not store an entry when the load fails', async () => {
    const { cache } = createCache();
    await expect(
      cache.load('default', 'alert.fired', async () => {
        throw new Error('es down');
      })
    ).rejects.toThrow('es down');
    expect(cache.read('default', 'alert.fired')).toBeUndefined();

    const fetchGroups = jest.fn(async () => groups(['1']));
    await cache.load('default', 'alert.fired', fetchGroups);

    expect(fetchGroups).toHaveBeenCalledTimes(1);
    expect(cache.read('default', 'alert.fired')?.groups).toEqual(groups(['1']));
  });

  it('drops only the requested space and trigger', async () => {
    const { cache } = createCache();
    await cache.load('space-a', 'alert.fired', async () => groups(['a']));
    await cache.load('space-b', 'alert.fired', async () => groups(['b']));
    await cache.load('space-a', 'cases.updated', async () => groups(['c']));

    cache.invalidate({ spaceId: 'space-a', triggerIds: ['alert.fired'] });

    expect(cache.read('space-a', 'alert.fired')).toBeUndefined();
    expect(cache.read('space-b', 'alert.fired')?.groups).toEqual(groups(['b']));
    expect(cache.read('space-a', 'cases.updated')?.groups).toEqual(groups(['c']));
  });

  it('drops a trigger in every space when allSpaces is set', async () => {
    const { cache } = createCache();
    await cache.load('space-a', 'alert.fired', async () => groups(['a']));
    await cache.load('space-b', 'alert.fired', async () => groups(['b']));
    await cache.load('space-a', 'cases.updated', async () => groups(['c']));

    cache.invalidate({ spaceId: 'global', triggerIds: ['alert.fired'], allSpaces: true });

    expect(cache.read('space-a', 'alert.fired')).toBeUndefined();
    expect(cache.read('space-b', 'alert.fired')).toBeUndefined();
    expect(cache.read('space-a', 'cases.updated')?.groups).toEqual(groups(['c']));
  });

  it('drops every entry on invalidateAll', async () => {
    const { cache } = createCache();
    await cache.load('space-a', 'alert.fired', async () => groups(['a']));
    await cache.load('space-b', 'cases.updated', async () => groups(['b']));

    cache.invalidateAll();

    expect(cache.read('space-a', 'alert.fired')).toBeUndefined();
    expect(cache.read('space-b', 'cases.updated')).toBeUndefined();
  });

  it('forgets a generation once nothing is left that might store', async () => {
    const { cache } = createCache();
    for (let index = 0; index < 20; index++) {
      await cache.load(`space-${index}`, 'alert.fired', async () => groups(['1']));
      cache.invalidate({ spaceId: `space-${index}`, triggerIds: ['alert.fired'] });
    }
    expect(retainedGenerations(cache)).toBe(0);

    let release: (value: SubscriptionCacheGroup[]) => void = () => {};
    const gate = new Promise<SubscriptionCacheGroup[]>((resolve) => {
      release = resolve;
    });
    const inflight = cache.load('default', 'alert.fired', () => gate);
    cache.invalidate({ spaceId: 'default', triggerIds: ['alert.fired'] });
    expect(retainedGenerations(cache)).toBe(1);

    release(groups(['stale']));
    await inflight;

    expect(cache.read('default', 'alert.fired')).toBeUndefined();
    expect(retainedGenerations(cache)).toBe(0);
  });

  it('stores a load that starts after an invalidate while the previous load is still running', async () => {
    const { cache } = createCache();
    let releaseStale: (value: SubscriptionCacheGroup[]) => void = () => {};
    const staleGate = new Promise<SubscriptionCacheGroup[]>((resolve) => {
      releaseStale = resolve;
    });

    const stale = cache.load('default', 'alert.fired', () => staleGate);
    cache.invalidate({ spaceId: 'default', triggerIds: ['alert.fired'] });
    const fresh = cache.load('default', 'alert.fired', async () => groups(['fresh']));
    releaseStale(groups(['stale']));

    await stale;
    await fresh;

    expect(cache.read('default', 'alert.fired')?.groups).toEqual(groups(['fresh']));
    expect(retainedGenerations(cache)).toBe(0);
  });

  it('evicts the oldest entry when the cap is reached', async () => {
    const { cache } = createCache({ maxEntries: 2 });
    await cache.load('default', 't1', async () => groups(['1']));
    await cache.load('default', 't2', async () => groups(['2']));
    await cache.load('default', 't3', async () => groups(['3']));

    expect(cache.read('default', 't1')).toBeUndefined();
    expect(cache.read('default', 't2')?.groups).toEqual(groups(['2']));
    expect(cache.read('default', 't3')?.groups).toEqual(groups(['3']));
  });
});
