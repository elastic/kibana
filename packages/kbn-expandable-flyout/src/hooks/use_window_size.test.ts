/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useWindowSize } from './use_window_size';

describe('useWindowSize', () => {
  it('should return the window size', () => {
    const hookResult = renderHook(() => useWindowSize());
    expect(hookResult.result.current).toEqual(1024);
  });
});
