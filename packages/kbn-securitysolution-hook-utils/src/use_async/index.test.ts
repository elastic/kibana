/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { useAsync } from '.';

interface TestArgs {
  n: number;
  s: string;
}

type TestReturn = Promise<unknown>;

describe('useAsync', () => {
  /**
   * Timeout for both jest tests and for the waitForNextUpdate.
   * jest tests default to 5 seconds and waitForNextUpdate defaults to 1 second.
   * 20_0000 = 20,000 milliseconds = 20 seconds
   */
  const timeout = 20_000;

  let fn: jest.Mock<TestReturn, TestArgs[]>;
  let args: TestArgs;

  beforeEach(() => {
    args = { n: 1, s: 's' };
    fn = jest.fn().mockResolvedValue(false);
  });

  it('does not invoke fn if start was not called', () => {
    renderHook(() => useAsync(fn));
    expect(fn).not.toHaveBeenCalled();
  });

  it(
    'invokes the function when start is called',
    async () => {
      const { result, waitForNextUpdate } = renderHook(() => useAsync(fn));

      act(() => {
        result.current.start(args);
      });
      await waitForNextUpdate({ timeout });

      expect(fn).toHaveBeenCalled();
    },
    timeout
  );

  it('invokes the function with start args', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAsync(fn));
    const expectedArgs = { ...args };

    act(() => {
      result.current.start(args);
    });
    await waitForNextUpdate({ timeout });

    expect(fn).toHaveBeenCalledWith(expectedArgs);
  });

  it(
    'populates result with the resolved value of the fn',
    async () => {
      const { result, waitForNextUpdate } = renderHook(() => useAsync(fn));
      fn.mockResolvedValue({ resolved: 'value' });

      act(() => {
        result.current.start(args);
      });
      await waitForNextUpdate({ timeout });

      expect(result.current.result).toEqual({ resolved: 'value' });
      expect(result.current.error).toBeUndefined();
    },
    timeout
  );

  it(
    'populates error if function rejects',
    async () => {
      fn.mockRejectedValue(new Error('whoops'));
      const { result, waitForNextUpdate } = renderHook(() => useAsync(fn));

      act(() => {
        result.current.start(args);
      });
      await waitForNextUpdate({ timeout });

      expect(result.current.result).toBeUndefined();
      expect(result.current.error).toEqual(new Error('whoops'));
    },
    timeout
  );

  it(
    'populates the loading state while the function is pending',
    async () => {
      let resolve: () => void;
      fn.mockImplementation(() => new Promise<void>((_resolve) => (resolve = _resolve)));

      const { result, waitForNextUpdate } = renderHook(() => useAsync(fn));

      act(() => {
        result.current.start(args);
      });

      expect(result.current.loading).toBe(true);

      act(() => resolve());
      await waitForNextUpdate({ timeout });

      expect(result.current.loading).toBe(false);
    },
    timeout
  );

  it(
    'multiple start calls reset state',
    async () => {
      let resolve: (result: string) => void;
      fn.mockImplementation(() => new Promise((_resolve) => (resolve = _resolve)));

      const { result, waitForNextUpdate } = renderHook(() => useAsync(fn));

      act(() => {
        result.current.start(args);
      });

      expect(result.current.loading).toBe(true);

      act(() => resolve('result'));
      await waitForNextUpdate({ timeout });

      expect(result.current.loading).toBe(false);
      expect(result.current.result).toBe('result');

      act(() => {
        result.current.start(args);
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.result).toBe(undefined);
      act(() => resolve('result'));
      await waitForNextUpdate({ timeout });

      expect(result.current.loading).toBe(false);
      expect(result.current.result).toBe('result');
    },
    timeout
  );
});
