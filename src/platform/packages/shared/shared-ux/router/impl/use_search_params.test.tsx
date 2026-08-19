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
import { createMemoryHistory } from 'history';
import { Router } from './router';
import { useSearchParams, type URLSearchParamsInit } from './use_search_params';

const renderUseSearchParams = (initialEntry = '/path', defaultInit?: URLSearchParamsInit) => {
  const history = createMemoryHistory({ initialEntries: [initialEntry] });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Router history={history}>{children}</Router>
  );

  const rendered = renderHook(() => useSearchParams(defaultInit), { wrapper });
  return { ...rendered, history };
};

describe('useSearchParams', () => {
  it('returns search params from the current location', () => {
    const { result } = renderUseSearchParams('/path?foo=bar&tag=a&tag=b');

    expect(result.current[0].get('foo')).toBe('bar');
    expect(result.current[0].getAll('tag')).toEqual(['a', 'b']);
  });

  it('merges default init values until setSearchParams is called', () => {
    const { result } = renderUseSearchParams('/path?foo=bar', { missing: 'default' });

    expect(result.current[0].get('foo')).toBe('bar');
    expect(result.current[0].get('missing')).toBe('default');
  });

  it('pushes a new search string by default', () => {
    const { result, history } = renderUseSearchParams('/path?foo=1');

    act(() => {
      result.current[1]({ foo: '2' });
    });

    expect(history.action).toBe('PUSH');
    expect(history.location.pathname).toBe('/path');
    expect(history.location.search).toBe('?foo=2');
    expect(result.current[0].get('foo')).toBe('2');
  });

  it('supports replace updates', () => {
    const { result, history } = renderUseSearchParams('/path?foo=1');
    const previousLength = history.length;

    act(() => {
      result.current[1]({ foo: '2' }, { replace: true });
    });

    expect(history.action).toBe('REPLACE');
    expect(history.length).toBe(previousLength);
    expect(history.location.search).toBe('?foo=2');
  });

  it('supports functional updates and URLSearchParams init', () => {
    const { result, history } = renderUseSearchParams('/path?foo=1&keep=yes');

    act(() => {
      result.current[1]((prev) => {
        const next = new URLSearchParams(prev);
        next.set('foo', '2');
        next.delete('keep');
        next.append('tag', 'a b');
        return next;
      });
    });

    expect(history.location.search).toBe('?foo=2&tag=a+b');
    expect(result.current[0].get('foo')).toBe('2');
    expect(result.current[0].get('keep')).toBeNull();
    expect(result.current[0].get('tag')).toBe('a b');
  });

  it('stops applying defaults after the first setSearchParams call', () => {
    const { result, history } = renderUseSearchParams('/path', { missing: 'default' });

    expect(result.current[0].get('missing')).toBe('default');

    act(() => {
      result.current[1]({});
    });

    expect(history.location.search).toBe('');
    expect(result.current[0].get('missing')).toBeNull();
  });
});
