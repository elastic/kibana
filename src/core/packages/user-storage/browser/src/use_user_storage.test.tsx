/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import type { IUserStorageClient } from './types';
import { UserStorageProvider } from './user_storage_provider';
import { useUserStorage, useUserStorageClient } from './use_user_storage';

const buildClient = (initial: Record<string, unknown> = {}): IUserStorageClient => {
  const cache: Record<string, unknown> = { ...initial };
  const subject$ = new BehaviorSubject<Record<string, unknown>>(cache);
  const client: IUserStorageClient = {
    peek: ((key: string, defaultValue?: unknown) =>
      (cache[key] !== undefined
        ? cache[key]
        : defaultValue) as never) as IUserStorageClient['peek'],
    get: ((key: string, defaultValue?: unknown) =>
      (cache[key] !== undefined ? cache[key] : defaultValue) as never) as IUserStorageClient['get'],
    get$: ((key: string, defaultValue?: unknown) => {
      // simple "get current value" observable
      return new BehaviorSubject(
        cache[key] !== undefined ? cache[key] : defaultValue
      ).asObservable();
    }) as IUserStorageClient['get$'],
    set: jest.fn(async (key: string, value: unknown) => {
      cache[key] = value;
      subject$.next({ ...cache });
      return value;
    }) as IUserStorageClient['set'],
    remove: jest.fn(async (key: string) => {
      delete cache[key];
      subject$.next({ ...cache });
    }) as IUserStorageClient['remove'],
    getUpdate$: () =>
      new BehaviorSubject({ type: 'remove' as const, key: '', oldValue: undefined }),
    getHttpError$: () => new BehaviorSubject(new Error('noop')),
  };
  return client;
};

const wrapper =
  (client: IUserStorageClient) =>
  ({ children }: { children: React.ReactNode }) =>
    <UserStorageProvider userStorage={client}>{children}</UserStorageProvider>;

// React surfaces render-time errors via console.error; suppress to keep
// expected-throw tests from polluting test output.
const expectThrowsFromRender = (fn: () => unknown, pattern: RegExp) => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(fn).toThrow(pattern);
  } finally {
    spy.mockRestore();
  }
};

describe('useUserStorageClient', () => {
  it('throws a clear error when called outside <UserStorageProvider>', () => {
    expectThrowsFromRender(
      () => renderHook(() => useUserStorageClient()),
      /must be used inside a <UserStorageProvider>/
    );
  });

  it('returns the provided client', () => {
    const client = buildClient();

    const { result } = renderHook(() => useUserStorageClient(), { wrapper: wrapper(client) });

    expect(result.current).toBe(client);
  });
});

describe('useUserStorage', () => {
  it('throws when called outside <UserStorageProvider>', () => {
    expectThrowsFromRender(
      () => renderHook(() => useUserStorage('any')),
      /must be used inside a <UserStorageProvider>/
    );
  });

  it('returns the cached value as the initial render', () => {
    const client = buildClient({ 'navigation:layout': { hidden: ['discover'] } });

    const { result } = renderHook(() => useUserStorage<{ hidden: string[] }>('navigation:layout'), {
      wrapper: wrapper(client),
    });

    const [value] = result.current;
    expect(value).toEqual({ hidden: ['discover'] });
  });

  it('falls back to defaultValue when the key is missing', () => {
    const client = buildClient();

    const { result } = renderHook(() => useUserStorage<string>('missing', 'fallback'), {
      wrapper: wrapper(client),
    });

    const [value] = result.current;
    expect(value).toBe('fallback');
  });

  it('calls client.set when the setter is invoked', async () => {
    const client = buildClient();

    const { result } = renderHook(() => useUserStorage<number>('counter', 0), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current[1](7);
    });

    expect(client.set).toHaveBeenCalledWith('counter', 7);
  });
});
