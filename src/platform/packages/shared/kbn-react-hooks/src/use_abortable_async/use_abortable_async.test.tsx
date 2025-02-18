/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { useAbortableAsync } from './use_abortable_async';

// Helper component to expose hook state.
function TestComponent<T>({
  hookFn,
  onState,
  deps = [],
}: {
  hookFn: ({ signal }: { signal: AbortSignal }) => T | Promise<T>;
  onState: (state: ReturnType<typeof useAbortableAsync>) => void;
  deps?: any[];
}) {
  const state = useAbortableAsync(hookFn, deps);
  useEffect(() => {
    onState(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, ...deps]);
  return null;
}

describe('useAbortableAsync', () => {
  it('should handle synchronous function', async () => {
    let hookState: any;
    render(
      <TestComponent
        hookFn={() => 42}
        onState={(state) => {
          hookState = state;
        }}
      />
    );
    await waitFor(() => expect(hookState).toBeDefined());
    expect(hookState.value).toBe(42);
    expect(hookState.loading).toBe(false);
    expect(hookState.error).toBeUndefined();
  });

  it('should handle asynchronous success', async () => {
    let hookState: any;
    const asyncFn = ({ signal }: { signal: AbortSignal }) =>
      new Promise<string>((resolve) => {
        const id = setTimeout(() => resolve('async result'), 10);
        // clean up
        signal.addEventListener('abort', () => clearTimeout(id));
      });

    render(
      <TestComponent
        hookFn={asyncFn}
        onState={(state) => {
          hookState = state;
        }}
      />
    );

    // Initially loading should be true.
    await waitFor(() => expect(hookState.loading).toBe(true));
    // After async completes.
    await waitFor(() => expect(hookState.loading).toBeFalsy());
    expect(hookState.error).toBeUndefined();
    expect(hookState.value).toBe('async result');
  });

  it('should handle asynchronous error', async () => {
    let hookState: any;
    const errorFn = ({ signal }: { signal: AbortSignal }) =>
      new Promise<string>((_resolve, reject) => {
        const id = setTimeout(() => reject(new Error('fail')), 10);
        // clean up
        signal.addEventListener('abort', () => clearTimeout(id));
      });

    render(
      <TestComponent
        hookFn={errorFn}
        onState={(state) => {
          hookState = state;
        }}
      />
    );

    await waitFor(() => expect(hookState.loading).toBeFalsy());
    expect(hookState.error).toBeInstanceOf(Error);
    expect(hookState.error?.message).toBe('fail');
    expect(hookState.value).toBeUndefined();
  });

  it('should refresh and re-run the async function', async () => {
    let hookState: any;
    let counter = 0;
    const asyncFn = ({ signal }: { signal: AbortSignal }) =>
      new Promise<number>((resolve) => {
        const id = setTimeout(() => resolve(++counter), 10);
        signal.addEventListener('abort', () => clearTimeout(id));
      });

    const { rerender } = render(
      <TestComponent
        hookFn={asyncFn}
        onState={(state) => {
          hookState = state;
        }}
      />
    );

    await waitFor(() => expect(hookState.loading).toBeFalsy());
    expect(hookState.value).toBe(1);

    act(() => {
      hookState.refresh();
    });

    // rerender to trigger update.
    rerender(
      <TestComponent
        hookFn={asyncFn}
        onState={(state) => {
          hookState = state;
        }}
      />
    );

    await waitFor(() => expect(hookState.loading).toBeFalsy());
    expect(hookState.value).toBe(2);
  });

  it('should abort previous async function when dependencies update', async () => {
    let hookState: any;
    let aborted = false;
    const asyncFn = ({ signal }: { signal: AbortSignal }) =>
      new Promise<string>(() => {
        signal.addEventListener('abort', () => {
          aborted = true;
        });
        // simulate a long running async process that never resolves
      });
    const { rerender } = render(
      <TestComponent
        hookFn={asyncFn}
        onState={(state) => {
          hookState = state;
        }}
        deps={[1]}
      />
    );
    // Ensure the initial async call is in-flight.
    await waitFor(() => expect(hookState.loading).toBe(true));
    // Updating the dependency should trigger abort on the previous async call.
    rerender(
      <TestComponent
        hookFn={asyncFn}
        onState={(state) => {
          hookState = state;
        }}
        deps={[2]}
      />
    );
    await waitFor(() => expect(aborted).toBe(true));
  });

  it('should not abort running promise when rerendered without dependency change', async () => {
    let hookState: any;
    let aborted = false;
    const asyncFn = ({ signal }: { signal: AbortSignal }) =>
      new Promise<string>(() => {
        signal.addEventListener('abort', () => {
          aborted = true;
        });
        // simulate a long running async process that never resolves
      });
    const { rerender } = render(
      <TestComponent
        hookFn={asyncFn}
        onState={(state) => {
          hookState = state;
        }}
        deps={[1]}
      />
    );
    await waitFor(() => expect(hookState.loading).toBe(true));
    // Rerender with the same dependency.
    rerender(
      <TestComponent
        hookFn={asyncFn}
        onState={(state) => {
          hookState = state;
        }}
        deps={[1]} // same dependency
      />
    );
    // Wait briefly to see if abort gets called.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(aborted).toBe(false);
    expect(hookState.loading).toBe(true);
  });
});
