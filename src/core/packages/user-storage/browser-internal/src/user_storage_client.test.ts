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

const deferred = <T = unknown>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const flushMicrotasks = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('UserStorageClient', () => {
  describe('isAvailable', () => {
    it('reflects the `available` flag passed at construction', () => {
      expect(buildClient({}, true).client.isAvailable()).toBe(true);
      expect(buildClient({}, false).client.isAvailable()).toBe(false);
    });
  });

  describe('when user storage is unavailable', () => {
    it('resolves get() to the default without issuing a request', async () => {
      const { client, api } = buildClient({}, false);

      await expect(client.get('key', 'fallback')).resolves.toBe('fallback');
      await expect(client.get('key')).resolves.toBeUndefined();
      expect(api.get).not.toHaveBeenCalled();
    });

    it('emits the default from get$ without issuing a request', async () => {
      const { client, api } = buildClient({}, false);

      await expect(firstValueFrom(client.get$('key', 'fallback'))).resolves.toBe('fallback');
      expect(api.get).not.toHaveBeenCalled();
    });

    it('emits the default once from get$ and never publishes an http error', async () => {
      const { client, api } = buildClient({}, false);
      const emissions: unknown[] = [];
      const httpErrors = jest.fn();
      client.getHttpError$().subscribe(httpErrors);
      client.get$('key', 'fallback').subscribe((v) => emissions.push(v));

      await flushMicrotasks();

      expect(emissions).toEqual(['fallback']);
      expect(api.get).not.toHaveBeenCalled();
      expect(httpErrors).not.toHaveBeenCalled();
    });

    it('rejects set() locally without issuing a request or publishing an http error', async () => {
      const { client, api } = buildClient({}, false);
      const httpErrors = jest.fn();
      client.getHttpError$().subscribe(httpErrors);

      await expect(client.set('key', 'value')).rejects.toThrow(
        'Cannot set user storage key "key": user storage is not available'
      );
      expect(api.set).not.toHaveBeenCalled();
      expect(httpErrors).not.toHaveBeenCalled();
      expect(client.peek('key')).toBeUndefined();
    });

    it('rejects remove() locally without issuing a request or publishing an http error', async () => {
      const { client, api } = buildClient({}, false);
      const httpErrors = jest.fn();
      client.getHttpError$().subscribe(httpErrors);

      await expect(client.remove('key')).rejects.toThrow(
        'Cannot remove user storage key "key": user storage is not available'
      );
      expect(api.remove).not.toHaveBeenCalled();
      expect(httpErrors).not.toHaveBeenCalled();
    });

    it('rejects a read-modify-write at the write step, after the read gave the default', async () => {
      const { client, api } = buildClient({}, false);

      const current = await client.get<string>('key', 'fallback');
      expect(current).toBe('fallback');

      await expect(client.set('key', `${current}-next`)).rejects.toThrow(
        'user storage is not available'
      );
      expect(api.get).not.toHaveBeenCalled();
      expect(api.set).not.toHaveBeenCalled();
    });

    it('does not re-emit on get$ for a rejected write', async () => {
      const { client } = buildClient({}, false);
      const emissions: unknown[] = [];
      client.get$('key', 'fallback').subscribe((v) => emissions.push(v));

      await expect(client.set('key', 'value')).rejects.toThrow();
      await expect(client.remove('key')).rejects.toThrow();

      // Only the initial default emission; neither failed write notified subscribers.
      expect(emissions).toEqual(['fallback']);
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
      // Defensive: the server contract shouldn't return `undefined`, but if it does, fall back to the default.
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

    it('emits the current value to every subscriber of the same observable', () => {
      const { client } = buildClient({ key: 'cached' });
      const value$ = client.get$<string>('key');
      const first = jest.fn();
      const second = jest.fn();

      value$.subscribe(first);
      value$.subscribe(second);

      expect(first).toHaveBeenCalledWith('cached');
      expect(second).toHaveBeenCalledWith('cached');
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

  describe('set', () => {
    it('updates cache and re-emits on get$ after a successful HTTP call', async () => {
      const { client, api } = buildClient({ key: 'old' });
      api.set.mockResolvedValue('new');

      const emissions: unknown[] = [];
      client.get$<string>('key').subscribe((v) => emissions.push(v));

      await client.set('key', 'new');

      expect(client.peek('key')).toBe('new');
      expect(emissions).toEqual(['old', 'new']);
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

    it('get$ re-emits the server-validated value, not the raw input', async () => {
      const { client, api } = buildClient({});
      api.set.mockResolvedValue('normalised');

      const emissions: unknown[] = [];
      client.get$<string>('key').subscribe((v) => emissions.push(v));

      await client.set('key', 'raw input');

      expect(emissions.at(-1)).toBe('normalised');
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
    it('clears cache and re-emits the default on get$ after a successful HTTP call', async () => {
      const { client, api } = buildClient({ key: 'old' });
      api.remove.mockResolvedValue(undefined);

      const emissions: unknown[] = [];
      client.get$<string>('key', 'registered-default').subscribe((v) => emissions.push(v));

      await client.remove('key');

      expect(client.peek('key')).toBeUndefined();
      expect(emissions).toEqual(['old', 'registered-default']);
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

  describe('stale fetch orphaning', () => {
    it('a set() during an in-flight fetch survives the fetch resolving (older read cannot clobber)', async () => {
      const { client, api } = buildClient({});
      const fetch1 = deferred<string>();
      api.get.mockReturnValueOnce(fetch1.promise);
      api.set.mockResolvedValue('written');

      const getPromise = client.get<string>('key'); // starts the lazy GET
      await client.set('key', 'written'); // write lands mid-fetch

      fetch1.resolve('stale-from-server'); // older GET resolves late

      await expect(getPromise).resolves.toBe('written');
      expect(client.peek('key')).toBe('written');
    });

    it('ignores a stale GET error that arrives after a successful set()', async () => {
      const { client, api } = buildClient({});
      const fetch1 = deferred<string>();
      api.get.mockReturnValueOnce(fetch1.promise);
      api.set.mockResolvedValue('written');

      const httpErrors = jest.fn();
      client.getHttpError$().subscribe(httpErrors);
      const emissions: unknown[] = [];
      client.get$<string>('key', 'default').subscribe((v) => emissions.push(v));

      const getPromise = client.get<string>('key');
      await client.set('key', 'written');

      fetch1.reject(new Error('network')); // older GET fails late
      await expect(getPromise).resolves.toBe('written');
      await flushMicrotasks();

      expect(httpErrors).not.toHaveBeenCalled();
      expect(emissions.at(-1)).toBe('written');
    });

    it('does not resurrect a removed value; later readers start a post-remove GET for the default', async () => {
      const { client, api } = buildClient({});
      const fetch1 = deferred<string>();
      const fetch2 = deferred<string>();
      api.get.mockReturnValueOnce(fetch1.promise).mockReturnValueOnce(fetch2.promise);
      api.remove.mockResolvedValue(undefined);

      const get1 = client.get<string>('key', 'server-default'); // starts fetch1
      await client.remove('key'); // invalidates the in-flight GET

      const get2 = client.get<string>('key', 'server-default'); // must NOT join the stale request
      expect(api.get).toHaveBeenCalledTimes(2);

      fetch1.resolve('stale-old-value'); // discarded
      fetch2.resolve('server-default'); // authoritative post-remove value

      await expect(get1).resolves.toBe('server-default');
      await expect(get2).resolves.toBe('server-default');
      expect(client.peek('key')).toBe('server-default');
    });

    it('ignores a stale GET error after remove(); only the post-remove GET decides the outcome', async () => {
      const { client, api } = buildClient({});
      const fetch1 = deferred<string>();
      const fetch2 = deferred<string>();
      api.get.mockReturnValueOnce(fetch1.promise).mockReturnValueOnce(fetch2.promise);
      api.remove.mockResolvedValue(undefined);

      const httpErrors = jest.fn();
      client.getHttpError$().subscribe(httpErrors);

      const get1 = client.get<string>('key', 'server-default');
      await client.remove('key');
      const get2 = client.get<string>('key', 'server-default');

      fetch1.reject(new Error('stale-network')); // discarded
      fetch2.resolve('server-default');

      await expect(get1).resolves.toBe('server-default');
      await expect(get2).resolves.toBe('server-default');
      await flushMicrotasks();
      expect(httpErrors).not.toHaveBeenCalled();
    });

    it('does not orphan an in-flight GET when a different key is written', async () => {
      const { client, api } = buildClient({});
      const fetchA = deferred<string>();
      api.get.mockReturnValueOnce(fetchA.promise);
      api.set.mockResolvedValue('b-written');

      const getA = client.get<string>('a');
      await client.set('b', 'b-written'); // unrelated key

      fetchA.resolve('a-fetched');
      await expect(getA).resolves.toBe('a-fetched');
      expect(client.peek('a')).toBe('a-fetched');
    });

    it('does not orphan the in-flight GET when the write fails', async () => {
      const { client, api } = buildClient({});
      const fetch1 = deferred<string>();
      api.get.mockReturnValueOnce(fetch1.promise);
      api.set.mockRejectedValue(new Error('write-failed'));

      const getPromise = client.get<string>('key');
      await expect(client.set('key', 'attempted')).rejects.toThrow('write-failed');

      fetch1.resolve('fetched'); // still authoritative — the failed write changed nothing
      await expect(getPromise).resolves.toBe('fetched');
      expect(client.peek('key')).toBe('fetched');
    });
  });

  describe('done$', () => {
    it('completes getHttpError$ and every get$ subscription when done$ completes', async () => {
      const { client, done$ } = buildClient({ key: 'seed' });

      const errors$ = client.getHttpError$();
      const completed = jest.fn();
      client.get$<string>('key').subscribe({ complete: completed });

      done$.complete();

      await expect(lastValueFrom(errors$, { defaultValue: 'done' })).resolves.toBe('done');
      expect(completed).toHaveBeenCalled();
    });
  });
});
