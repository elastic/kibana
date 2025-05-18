/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act, cleanup } from '@testing-library/react';

import { useBoolean } from './use_boolean';

describe('useBoolean hook', () => {
  afterEach(cleanup);

  it('should return an array. The first element should be a boolean, the second element is an object which should contain three functions: "on", "off" and "toggle"', () => {
    const { result } = renderHook(() => useBoolean());
    const [value, handlers] = result.current;

    expect(typeof value).toBe('boolean');
    expect(typeof handlers).toBe('object');
    expect(typeof handlers.on).toBe('function');
    expect(typeof handlers.off).toBe('function');
    expect(typeof handlers.toggle).toBe('function');
  });

  it('should initialize the value with false by default', () => {
    const { result } = renderHook(() => useBoolean());
    const [value, handlers] = result.current;

    expect(value).toBe(false);
    expect(typeof handlers).toBe('object');
  });

  it('should toggle the value when no value is passed to the updater function', () => {
    const { result } = renderHook(() => useBoolean());
    const [, { toggle }] = result.current;

    expect(result.current[0]).toBe(false);

    act(() => {
      toggle();
    });
    expect(result.current[0]).toBe(true);

    act(() => {
      toggle();
    });
    expect(result.current[0]).toBe(false);
  });

  it('should set the value to true the value when the "on" method is invoked, once or multiple times', () => {
    const { result } = renderHook(() => useBoolean());
    const [, { on }] = result.current;

    expect(result.current[0]).toBe(false);

    act(() => {
      on();
    });
    expect(result.current[0]).toBe(true);

    act(() => {
      on();
      on();
    });
    expect(result.current[0]).toBe(true);
  });

  it('should set the value to false the value when the "off" method is invoked, once or multiple times', () => {
    const { result } = renderHook(() => useBoolean(true));
    const [, { off }] = result.current;

    expect(result.current[0]).toBe(true);

    act(() => {
      off();
    });
    expect(result.current[0]).toBe(false);

    act(() => {
      off();
      off();
    });
    expect(result.current[0]).toBe(false);
  });

  it('should return the handlers as memoized functions', () => {
    const { result } = renderHook(() => useBoolean(true));
    const [, { on, off, toggle }] = result.current;

    expect(typeof on).toBe('function');
    expect(typeof off).toBe('function');
    expect(typeof toggle).toBe('function');

    act(() => {
      toggle();
    });

    const [, handlers] = result.current;
    expect(on).toBe(handlers.on);
    expect(off).toBe(handlers.off);
    expect(toggle).toBe(handlers.toggle);
  });
});
