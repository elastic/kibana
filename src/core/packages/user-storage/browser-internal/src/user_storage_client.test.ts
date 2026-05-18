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
    getAll: jest.fn(),
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
  });

  describe('get$', () => {
    it('emits the current value immediately and on subsequent updates', async () => {
      const { client, api } = buildClient({ key: 'first' });
      api.set.mockResolvedValue(undefined);

      const emissions = lastValueFrom(client.get$<string>('key').pipe(take(2), toArray()));

      await client.set('key', 'second');

      expect(await emissions).toEqual(['first', 'second']);
    });

    it('does not emit for unrelated keys', async () => {
      const { client, api } = buildClient({});
      api.set.mockResolvedValue(undefined);

      const first = firstValueFrom(client.get$('a'));
      await client.set('b', 99);

      // only the initial emission resolves; if `b` had leaked we'd see 99.
      await expect(first).resolves.toBeUndefined();
    });
  });

  describe('set', () => {
    it('updates cache and emits on update$ after a successful HTTP call', async () => {
      const { client, api } = buildClient({ key: 'old' });
      api.set.mockResolvedValue(undefined);

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

    it('does not mutate cache or emit when the HTTP call fails, and rejects', async () => {
      const { client, api } = buildClient({ key: 'old' });
      api.set.mockRejectedValue(new Error('boom'));

      const errors = firstValueFrom(client.getUpdateErrors$());

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

    it('rejects and emits on errors$ when the HTTP call fails', async () => {
      const { client, api } = buildClient({ key: 'old' });
      api.remove.mockRejectedValue(new Error('nope'));

      const errors = firstValueFrom(client.getUpdateErrors$());

      await expect(client.remove('key')).rejects.toThrow('nope');
      expect(client.get('key')).toBe('old');
      await expect(errors).resolves.toEqual(expect.any(Error));
    });
  });

  describe('done$', () => {
    it('completes update$ and updateErrors$ when done$ completes', async () => {
      const { client, done$ } = buildClient({});

      const update$ = client.getUpdate$();
      const errors$ = client.getUpdateErrors$();

      done$.complete();

      await expect(lastValueFrom(update$, { defaultValue: 'done' })).resolves.toBe('done');
      await expect(lastValueFrom(errors$, { defaultValue: 'done' })).resolves.toBe('done');
    });
  });
});
