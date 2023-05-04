/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useShallowMemo } from './use_shallow_memo';

describe('useShallowMemo', () => {
  it('should return the initial value', () => {
    const value = { a: 'b' };
    const { result } = renderHook(useShallowMemo, { initialProps: value });

    expect(result.current).toBe(value);
  });

  it('should return the same value for a shallow copy', () => {
    const value = { a: 'b', c: 'd' };
    const newValue = { a: 'b', c: 'd' };
    const hook = renderHook(useShallowMemo, { initialProps: value });
    hook.rerender(newValue);

    expect(hook.result.current).toBe(value);
  });

  it('should return the updated value', () => {
    const value = { a: { b: 'c' } };
    const newValue = { a: { b: 'c' } };
    const hook = renderHook(useShallowMemo, { initialProps: value });
    hook.rerender(newValue);

    expect(hook.result.current).toBe(newValue);
  });
});
