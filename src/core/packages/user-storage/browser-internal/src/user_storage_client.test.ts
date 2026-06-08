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

const buildClient = (initialValues: Record<string, unknown> = {}) => {
  const api = apiMock();
  const done$ = new Subject<void>();
  const client = new UserStorageClient({ api, initialValues, done$ });
  return { api, done$, client };
};

describe('UserStorageClient', () => {
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
    it('returns cached values seeded from initialValues', () => {
      const { client } = buildClient({ a: 1, b: 'two' });

      expect(client.get('a')).toBe(1);
      expect(client.get('b')).toBe('two');
    });

    it('returns the defaultValue when the key is not cached', () => {
      const { client } = buildClient({});

      expect(client.get('missing', 'fallback')).toBe('fallback');
    });

    it('triggers a lazy fetch on first access for an uncached key', () => {
      const { client, api } = buildClient({});
      api.get.mockResolvedValue('lazy-value');

      client.get('uncached');

      expect(api.get).toHaveBeenCalledWith('uncached');
    });

    it('does not trigger a second fetch when the key is already cached', () => {
      const { client, api } = buildClient({ key: 'present' });

      client.get('key');
      client.get('key');

      expect(api.get).not.toHaveBeenCalled();
    });

    it('does not trigger a second fetch when one is already in flight', () => {
      const { client, api } = buildClient({});
      // never resolves — simulates in-flight request
      api.get.mockReturnValue(new Promise(() => {}));

      client.get('key');
      client.get('key');

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

      // First get triggers the fetch
      client.get('key');

      await expect(httpError).resolves.toMatchObject({ message: 'network-error' });

      // After failure the key is removed from fetchInitiated — a new get should re-trigger
      api.get.mockResolvedValue('retry-value');
      client.get('key');
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('set', () => {
    it('updates cache and emits on update$ after a successful HTTP call', async () => {
      const { client, api } = buildClient({ key: 'old' });
      api.set.mockResolvedValue('new');

      const updates = firstValueFrom(client.getUpdate$());

      await client.set('key', 'new');

      expect(client.get('key')).toBe('new');
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
      expect(client.get('key')).toBe('trimmed');
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
      expect(client.get('key')).toBe('old');
      await expect(errors).resolves.toEqual(expect.any(Error));
    });
  });

  describe('remove', () => {
    it('clears cache and emits on update$ after a successful HTTP call', async () => {
      const { client, api } = buildClient({ key: 'old' });
      api.remove.mockResolvedValue(undefined);

      const updates = firstValueFrom(client.getUpdate$());

      await client.remove('key');

      expect(client.get('key')).toBeUndefined();
      await expect(updates).resolves.toEqual({ type: 'remove', key: 'key', oldValue: 'old' });
    });

    it('rejects and emits on getHttpError$ when the HTTP call fails', async () => {
      const { client, api } = buildClient({ key: 'old' });
      api.remove.mockRejectedValue(new Error('nope'));

      const errors = firstValueFrom(client.getHttpError$());

      await expect(client.remove('key')).rejects.toThrow('nope');
      expect(client.get('key')).toBe('old');
      await expect(errors).resolves.toEqual(expect.any(Error));
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
