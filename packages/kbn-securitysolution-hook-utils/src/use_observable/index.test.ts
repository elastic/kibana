/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { Subject, throwError } from 'rxjs';

import { useObservable } from '.';

interface TestArgs {
  n: number;
  s: string;
}

type TestReturn = Subject<unknown>;

describe('useObservable', () => {
  let fn: jest.Mock<TestReturn, TestArgs[]>;
  let subject: TestReturn;
  let args: TestArgs;

  beforeEach(() => {
    args = { n: 1, s: 's' };
    subject = new Subject();
    fn = jest.fn().mockReturnValue(subject);
  });

  it('does not invoke fn if start was not called', () => {
    renderHook(() => useObservable(fn));
    expect(fn).not.toHaveBeenCalled();
  });

  it('invokes the function when start is called', () => {
    const { result } = renderHook(() => useObservable(fn));

    act(() => {
      result.current.start(args);
    });

    expect(fn).toHaveBeenCalled();
  });

  it('invokes the function with start args', () => {
    const { result } = renderHook(() => useObservable(fn));
    const expectedArgs = { ...args };

    act(() => {
      result.current.start(args);
    });

    expect(fn).toHaveBeenCalledWith(expectedArgs);
  });

  it('populates result with the next value of the fn', () => {
    const { result } = renderHook(() => useObservable(fn));

    act(() => {
      result.current.start(args);
    });
    act(() => subject.next('value'));

    expect(result.current.result).toEqual('value');
    expect(result.current.error).toBeUndefined();
  });

  it('populates error if observable throws an error', () => {
    const error = new Error('whoops');
    const errorFn = () => throwError(error);

    const { result } = renderHook(() => useObservable(errorFn));

    act(() => {
      result.current.start();
    });

    expect(result.current.result).toBeUndefined();
    expect(result.current.error).toEqual(error);
  });

  it('populates the loading state while no value has resolved', () => {
    const { result } = renderHook(() => useObservable(fn));

    act(() => {
      result.current.start(args);
    });

    expect(result.current.loading).toBe(true);

    act(() => subject.next('a value'));

    expect(result.current.loading).toBe(false);
  });

  it('updates result with each resolved value', () => {
    const { result } = renderHook(() => useObservable(fn));

    act(() => {
      result.current.start(args);
    });

    act(() => subject.next('a value'));
    expect(result.current.result).toEqual('a value');

    act(() => subject.next('a subsequent value'));
    expect(result.current.result).toEqual('a subsequent value');
  });

  it('does not update result with values if start has not been called', () => {
    const { result } = renderHook(() => useObservable(fn));

    act(() => subject.next('a value'));
    expect(result.current.result).toBeUndefined();

    act(() => subject.next('a subsequent value'));
    expect(result.current.result).toBeUndefined();
  });

  it('unsubscribes on unmount', () => {
    const { result, unmount } = renderHook(() => useObservable(fn));

    act(() => {
      result.current.start(args);
    });
    expect(subject.observers).toHaveLength(1);

    unmount();
    expect(subject.observers).toHaveLength(0);
  });

  it('multiple start calls reset state', () => {
    const { result } = renderHook(() => useObservable(fn));

    act(() => {
      result.current.start(args);
    });

    expect(result.current.loading).toBe(true);

    act(() => subject.next('one value'));

    expect(result.current.loading).toBe(false);
    expect(result.current.result).toBe('one value');

    act(() => {
      result.current.start(args);
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.result).toBe(undefined);

    act(() => subject.next('another value'));

    expect(result.current.loading).toBe(false);
    expect(result.current.result).toBe('another value');
  });
});
