/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject, firstValueFrom, lastValueFrom, take, toArray } from 'rxjs';
import { UserStorageClient } from './user_storage_client';
import type { UserStorageApi } from './user_storage_api';

const apiMock = (): jest.Mocked<UserStorageApi> =>
  ({
    get: jest.fn().mockReturnValue(new Promise(() => {})), // never resolves by default
    set: jest.fn(),
    remove: jest.fn(),
  } as unknown as jest.Mocked<UserStorageApi>);

const buildClient = (initialValues: Record<string, unknown> = {}, available = true) => {
  const api = apiMock();
  const done$ = new Subject<void>();
  const client = new UserStorageClient({ api, initialValues, available, done$ });
  return { api, done$, client };
};

describe('UserStorageClient', () => {
  describe('isAvailable', () => {
    it('reflects the `available` flag passed at construction', () => {
      expect(buildClient({}, true).client.isAvailable()).toBe(true);
      expect(buildClient({}, false).client.isAvailable()).toBe(false);
    });
  });

  describe('peek', () => {
    it('returns cached values without triggering a lazy fetch', () => {
      const { client, api } = buildClient({ a: 1 });

      expect(client.peek('a')).toBe(1);
      expect(api.get).not.toHaveBeenCalled();
    });

    it('returns undefined for a missing key without triggering a lazy fetch', () => {
      const { client, api } = buildClient({});

      expect(client.peek('missing')).toBeUndefined();
      expect(api.get).not.toHaveBeenCalled();
    });

    it('returns defaultValue for a missing key without triggering a lazy fetch', () => {
      const { client, api } = buildClient({});

      expect(client.peek('missing', 'fallback')).toBe('fallback');
      expect(api.get).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('resolves cached values seeded from initialValues without an HTTP call', async () => {
      const { client, api } = buildClient({ a: 1, b: 'two' });

      await expect(client.get('a')).resolves.toBe(1);
      await expect(client.get('b')).resolves.toBe('two');
      expect(api.get).not.toHaveBeenCalled();
    });

    it('awaits the lazy fetch and resolves the fetched value for an uncached key', async () => {
      const { client, api } = buildClient({});
      api.get.mockResolvedValue('lazy-value');

      await expect(client.get('uncached')).resolves.toBe('lazy-value');
      expect(api.get).toHaveBeenCalledWith('uncached');
    });

    it('resolves the defaultValue when the fetch resolves with no value', async () => {
      // Defensive: the server contract guarantees resolved values are never
      // `undefined` (registration rejects such schemas), but if one slips
      // through, `get` still falls back to the caller's default.
      const { client, api } = buildClient({});
      api.get.mockResolvedValue(undefined);

      await expect(client.get('missing', 'fallback')).resolves.toBe('fallback');
    });

    it('rejects when the lazy fetch fails, and does not cache a value', async () => {
      const { client, api } = buildClient({});
      api.get.mockRejectedValue(new Error('network-error'));

      await expect(client.get('key', 'fallback')).rejects.toThrow('network-error');
      expect(client.peek('key')).toBeUndefined();
    });

    it('does not trigger a second fetch when the key is already cached', async () => {
      const { client, api } = buildClient({ key: 'present' });

      await client.get('key');
      await client.get('key');

      expect(api.get).not.toHaveBeenCalled();
    });

    it('does not trigger a second fetch when one is already in flight', () => {
      const { client, api } = buildClient({});
      // never resolves — simulates in-flight request
      api.get.mockReturnValue(new Promise(() => {}));

      void client.get('key');
      void client.get('key');

      expect(api.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('get$', () => {
    it('emits the current value immediately and on subsequent updates', async () => {
      const { client, api } = buildClient({ key: 'first' });
      api.set.mockResolvedValue('second');

      const emissions = lastValueFrom(client.get$<string>('key').pipe(take(2), toArray()));

      await client.set('key', 'second');

      expect(await emissions).toEqual(['first', 'second']);
    });

    it('does not emit for unrelated keys', async () => {
      const { client, api } = buildClient({ a: 'initial' });
      api.set.mockResolvedValue(99);

      const first = firstValueFrom(client.get$('a'));
      await client.set('b', 99);

      // only the initial emission resolves; if `b` had leaked we'd see 99.
      await expect(first).resolves.toBe('initial');
    });

    it('triggers the lazy fetch on subscribe for an uncached key', () => {
      const { client, api } = buildClient({});

      client.get$('key').subscribe();

      expect(api.get).toHaveBeenCalledWith('key');
    });

    it('emits the lazy-fetched value once the fetch resolves', async () => {
      const { client, api } = buildClient({});

      let resolveFetch!: (v: string) => void;
      api.get.mockReturnValue(new Promise<string>((resolve) => (resolveFetch = resolve)));

      const emissions = lastValueFrom(client.get$<string>('key').pipe(take(2), toArray()));

      // Trigger the lazy fetch (first emission is undefined)
      resolveFetch('lazy-value');
      // Allow promise microtasks to flush
      await Promise.resolve();

      expect(await emissions).toEqual([undefined, 'lazy-value']);
    });

    it('emits to getHttpError$ and retries on next subscription if fetch fails', async () => {
      const { client, api } = buildClient({});

      api.get.mockRejectedValueOnce(new Error('network-error'));

      const httpError = firstValueFrom(client.getHttpError$());

      // First subscription triggers the fetch
      client.get$('key').subscribe();

      await expect(httpError).resolves.toMatchObject({ message: 'network-error' });

      // After failure the key is removed from the in-flight map — a new
      // subscription should re-trigger the fetch.
      api.get.mockResolvedValue('retry-value');
      client.get$('key').subscribe();
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('getState$', () => {
    it('emits resolved immediately when the key is already cached', async () => {
      const { client, api } = buildClient({ key: 'cached' });

      await expect(firstValueFrom(client.getState$<string>('key'))).resolves.toEqual({
        status: 'resolved',
        value: 'cached',
      });
      expect(api.get).not.toHaveBeenCalled();
    });

    it('emits loading then resolved for an uncached key', async () => {
      const { client, api } = buildClient({});
      let resolveFetch!: (v: string) => void;
      api.get.mockReturnValue(new Promise<string>((resolve) => (resolveFetch = resolve)));

      const emissions = lastValueFrom(
        client.getState$<string>('key', 'default').pipe(take(2), toArray())
      );

      resolveFetch('resolved-value');
      await Promise.resolve();

      expect(await emissions).toEqual([
        { status: 'loading', value: 'default' },
        { status: 'resolved', value: 'resolved-value' },
      ]);
    });

    it('emits loading then error when the fetch fails', async () => {
      const { client, api } = buildClient({});
      const error = new Error('boom');
      let rejectFetch!: (e: Error) => void;
      api.get.mockReturnValue(new Promise<string>((_resolve, reject) => (rejectFetch = reject)));

      const emissions = lastValueFrom(
        client.getState$<string>('key', 'default').pipe(take(2), toArray())
      );

      rejectFetch(error);
      await Promise.resolve();

      expect(await emissions).toEqual([
        { status: 'loading', value: 'default' },
        { status: 'error', value: 'default', error },
      ]);
    });

    it('re-emits resolved after an explicit write', async () => {
      const { client, api } = buildClient({ key: 'first' });
      api.set.mockResolvedValue('second');

      const emissions = lastValueFrom(client.getState$<string>('key').pipe(take(2), toArray()));

      await client.set('key', 'second');

      expect(await emissions).toEqual([
        { status: 'resolved', value: 'first' },
        { status: 'resolved', value: 'second' },
      ]);
    });
  });

  describe('set', () => {
    it('updates cache and emits on update$ after a successful HTTP call', async () => {
      const { client, api } = buildClient({ key: 'old' });
      api.set.mockResolvedValue('new');

      const updates = firstValueFrom(client.getUpdate$());

      await client.set('key', 'new');

      expect(client.peek('key')).toBe('new');
      await expect(updates).resolves.toEqual({
        type: 'set',
        key: 'key',
        newValue: 'new',
        oldValue: 'old',
      });
    });

    it('caches the server-validated value rather than the raw input', async () => {
      // Simulates a schema that transforms the value (e.g. z.string().trim()).
      // The server returns the post-transform value; the browser must cache that.
      const { client, api } = buildClient({});
      api.set.mockResolvedValue('trimmed');

      const stored = await client.set('key', '  trimmed  ');

      expect(stored).toBe('trimmed');
      expect(client.peek('key')).toBe('trimmed');
    });

    it('update$ emits the server-validated newValue, not the raw input', async () => {
      const { client, api } = buildClient({});
      api.set.mockResolvedValue('normalised');

      const updates = firstValueFrom(client.getUpdate$());

      await client.set('key', 'raw input');

      await expect(updates).resolves.toEqual(expect.objectContaining({ newValue: 'normalised' }));
    });

    it('does not mutate cache or emit when the HTTP call fails, and rejects', async () => {
      const { client, api } = buildClient({ key: 'old' });
      api.set.mockRejectedValue(new Error('boom'));

      const errors = firstValueFrom(client.getHttpError$());

      await expect(client.set('key', 'new')).rejects.toThrow('boom');
      expect(client.peek('key')).toBe('old');
      await expect(errors).resolves.toEqual(expect.any(Error));
    });
  });

  describe('remove', () => {
    it('clears cache and emits on update$ after a successful HTTP call', async () => {
      const { client, api } = buildClient({ key: 'old' });
      api.remove.mockResolvedValue(undefined);

      const updates = firstValueFrom(client.getUpdate$());

      await client.remove('key');

      expect(client.peek('key')).toBeUndefined();
      await expect(updates).resolves.toEqual({ type: 'remove', key: 'key', oldValue: 'old' });
    });

    it('rejects and emits on getHttpError$ when the HTTP call fails', async () => {
      const { client, api } = buildClient({ key: 'old' });
      api.remove.mockRejectedValue(new Error('nope'));

      const errors = firstValueFrom(client.getHttpError$());

      await expect(client.remove('key')).rejects.toThrow('nope');
      expect(client.peek('key')).toBe('old');
      await expect(errors).resolves.toEqual(expect.any(Error));
    });
  });

  describe('update', () => {
    it('reads the resolved (not unhydrated) current value as the mutation base', async () => {
      // Regression for the presets data-loss race (elastic/kibana#276110): a
      // save issued before a lazy key hydrates must not compute its mutation
      // from the caller's default — it must await the real stored value.
      const { client, api } = buildClient({});
      let resolveFetch!: (v: { items: string[] }) => void;
      api.get.mockReturnValue(
        new Promise<{ items: string[] }>((resolve) => (resolveFetch = resolve))
      );

      const updatePromise = client.update<{ items: string[] }>('key', { items: [] }, (current) => ({
        items: [...current.items, 'new'],
      }));

      // Cache is still unhydrated at this point — if `update` read via `peek`
      // it would compute from `{ items: [] }` instead of the real stored value.
      resolveFetch({ items: ['existing'] });

      await updatePromise;

      expect(api.set).toHaveBeenCalledWith('key', { items: ['existing', 'new'] });
    });

    it('skips the write when the updater returns the same reference (no-op)', async () => {
      // The client clones `initialValues` internally, so assert against the
      // cached (post-clone) reference rather than the object passed in here.
      const { client, api } = buildClient({ key: { items: ['a'] } });
      const cached = client.peek('key');

      const result = await client.update('key', { items: [] }, (current) => current);

      expect(result).toBe(cached);
      expect(api.set).not.toHaveBeenCalled();
    });

    it('persists the updater result when it differs from the current value', async () => {
      const { client, api } = buildClient({ key: { items: ['a'] } });
      api.set.mockResolvedValue({ items: ['a', 'b'] });

      const result = await client.update<{ items: string[] }>('key', { items: [] }, (current) => ({
        items: [...current.items, 'b'],
      }));

      expect(api.set).toHaveBeenCalledWith('key', { items: ['a', 'b'] });
      expect(result).toEqual({ items: ['a', 'b'] });
    });
  });

  describe('done$', () => {
    it('completes update$ and getHttpError$ when done$ completes', async () => {
      const { client, done$ } = buildClient({});

      const update$ = client.getUpdate$();
      const errors$ = client.getHttpError$();

      done$.complete();

      await expect(lastValueFrom(update$, { defaultValue: 'done' })).resolves.toBe('done');
      await expect(lastValueFrom(errors$, { defaultValue: 'done' })).resolves.toBe('done');
    });
  });
});
