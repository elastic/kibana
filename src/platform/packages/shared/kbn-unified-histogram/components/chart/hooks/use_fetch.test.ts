/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useFetch } from './use_fetch';
import { renderHook } from '@testing-library/react';
import { UnifiedHistogramInput$ } from '../../../types';
import { Subject } from 'rxjs';

describe('useFetch', () => {
  const getDeps: () => {
    input$: UnifiedHistogramInput$;
    beforeFetch: () => void;
  } = () => ({
    input$: new Subject(),
    beforeFetch: () => {},
  });

  it('should trigger the fetch observable when the input$ observable is triggered', () => {
    const originalDeps = getDeps();
    const hook = renderHook((deps) => useFetch(deps), {
      initialProps: originalDeps,
    });
    const fetch = jest.fn();
    hook.result.current.subscribe(fetch);
    expect(fetch).not.toHaveBeenCalled();
    originalDeps.input$.next({ type: 'fetch' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
