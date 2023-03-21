/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useStableCallback } from './use_stable_callback';

describe('useStableCallback', () => {
  it('should return a stable callback', () => {
    const hook = renderHook((cb) => useStableCallback(cb), { initialProps: () => {} });
    const firstCallback = hook.result.current;
    hook.rerender(() => {});
    expect(hook.result.current).toBe(firstCallback);
  });
});
