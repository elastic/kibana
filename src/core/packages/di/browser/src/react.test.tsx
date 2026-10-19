/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { FC, PropsWithChildren } from 'react';
import { renderHook } from '@testing-library/react';
import { Container } from 'inversify';
import { Context, useService } from './react';

describe('useService', () => {
  let container: Container;
  let wrapper: FC<PropsWithChildren<{}>>;

  beforeEach(() => {
    container = new Container();
    wrapper = ({ children }) => <Context.Provider value={container}>{children}</Context.Provider>;
  });

  it('should resolve a synchronously bound service', () => {
    container.bind('service').toConstantValue('value');

    const { result } = renderHook(() => useService<string>('service'), { wrapper });

    expect(result.current).toBe('value');
  });

  it('should resolve an asynchronously bound service', async () => {
    container.bind('service').toResolvedValue(async () => 'value');

    const { result } = renderHook(() => useService<string>('service', { async: true }), {
      wrapper,
    });

    await expect(result.current).resolves.toBe('value');
  });

  it('should resolve a synchronously bound service asynchronously', async () => {
    container.bind('service').toConstantValue('value');

    const { result } = renderHook(() => useService<string>('service', { async: true }), {
      wrapper,
    });

    await expect(result.current).resolves.toBe('value');
  });

  it('should throw when resolving an asynchronously bound service synchronously', () => {
    container.bind('service').toResolvedValue(async () => 'value');

    expect(() => renderHook(() => useService('service'), { wrapper })).toThrow();
  });
});
