/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RefObject } from 'react';
import { act, renderHook, RenderHookResult } from '@testing-library/react-hooks';
import { Subject } from 'rxjs';
import type { IInterpreterRenderHandlers } from '../../common';
import { ExpressionRendererParams, useExpressionRenderer } from './use_expression_renderer';
import * as loader from '../loader';

describe('useExpressionRenderer', () => {
  const expressionLoaderSpy = jest.spyOn(loader, 'ExpressionLoader');
  let nodeRef: RefObject<HTMLElement>;
  let expressionLoader: jest.Mocked<loader.ExpressionLoader> & {
    data$: Subject<unknown>;
    events$: Subject<unknown>;
    loading$: Subject<void>;
    render$: Subject<number>;
  };
  let hook: RenderHookResult<ExpressionRendererParams, ReturnType<typeof useExpressionRenderer>>;

  beforeEach(() => {
    nodeRef = { current: document.createElement('div') };
    expressionLoader = {
      data$: new Subject(),
      events$: new Subject(),
      loading$: new Subject(),
      render$: new Subject(),
      destroy: jest.fn(),
      inspect: jest.fn(),
      update: jest.fn(),
    } as unknown as typeof expressionLoader;

    expressionLoaderSpy.mockImplementation(() => expressionLoader);
    hook = renderHook(
      (params: ExpressionRendererParams) => useExpressionRenderer(nodeRef, params),
      { initialProps: { expression: 'something' } }
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should return default state', () => {
    expect(hook.result.current).toEqual({
      isEmpty: true,
      isLoading: false,
      error: null,
    });
  });

  it('should update loader options on properties change', () => {
    expect(expressionLoader.update).not.toHaveBeenCalled();

    hook.rerender({ expression: 'something else', partial: true });

    expect(expressionLoader.update).toHaveBeenCalledWith('something else', { partial: true });
  });

  it('should debounce property changes', () => {
    jest.useFakeTimers('modern');

    hook.rerender({ debounce: 1000, expression: 'something else' });
    expect(expressionLoader.update).not.toHaveBeenCalled();

    expect(hook.result.current).toEqual(expect.objectContaining({ isLoading: true }));

    act(() => void jest.advanceTimersByTime(1000));
    expect(hook.result.current).toEqual(expect.objectContaining({ isLoading: false }));
    expect(expressionLoader.update).toHaveBeenCalledWith('something else', {});

    jest.useRealTimers();
  });

  it('should not debounce if loader optaions are not changed', () => {
    jest.useFakeTimers('modern');

    hook.rerender({ expression: 'something else', partial: true });
    hook.rerender({
      expression: 'something else',
      debounce: 1000,
      hasCustomErrorRenderer: true,
      partial: true,
    });

    expect(hook.result.current).toEqual(expect.objectContaining({ isLoading: false }));
    expect(expressionLoader.update).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('should handle rendering errors', () => {
    expressionLoaderSpy.mockClear();
    const onRenderError = jest.fn();
    const done = jest.fn();
    hook.rerender({ onRenderError, expression: 'something' });

    expect(expressionLoaderSpy).toHaveBeenCalledTimes(1);

    const [[, , loaderParams]] = expressionLoaderSpy.mock.calls;
    act(() =>
      loaderParams?.onRenderError?.(document.createElement('div'), new Error('something'), {
        done,
      } as unknown as IInterpreterRenderHandlers)
    );

    expect(hook.result.current).toEqual({
      isEmpty: false,
      isLoading: false,
      error: new Error('something'),
    });
    expect(onRenderError).toHaveBeenCalled();
    expect(done).not.toHaveBeenCalled();
  });

  it('should notify loader handlers on custom error rendering', () => {
    const done = jest.fn();
    hook.rerender({ expression: 'something', hasCustomErrorRenderer: true });

    expect(expressionLoaderSpy).toHaveBeenCalledTimes(1);

    const [[, , loaderParams]] = expressionLoaderSpy.mock.calls;
    act(() =>
      loaderParams?.onRenderError?.(document.createElement('div'), new Error('something'), {
        done,
      } as unknown as IInterpreterRenderHandlers)
    );

    expect(done).toHaveBeenCalled();
  });

  it('should update loading state', () => {
    expect(hook.result.current).toHaveProperty('isLoading', false);
    act(() => expressionLoader.loading$.next());
    expect(hook.result.current).toHaveProperty('isLoading', true);
  });

  it('should call the event handler', () => {
    const onEvent = jest.fn();
    hook.rerender({ onEvent, expression: 'something' });
    act(() => expressionLoader.events$.next('event'));

    expect(onEvent).toHaveBeenCalledWith('event');
  });

  it('should call the data handler', () => {
    const adapters = {};
    const onData$ = jest.fn();
    hook.rerender({ onData$, expression: 'something' });
    expressionLoader.inspect.mockReturnValueOnce(adapters);
    act(() => expressionLoader.data$.next({ partial: true, result: 'something' }));

    expect(onData$).toHaveBeenCalledWith('something', adapters, true);
  });

  it('should update on loader options changes', () => {
    const adapters = {};
    const onData$ = jest.fn();
    hook.rerender({ onData$, expression: 'something' });
    expressionLoader.inspect.mockReturnValueOnce(adapters);
    act(() => expressionLoader.data$.next({ partial: true, result: 'something' }));

    expect(onData$).toHaveBeenCalledWith('something', adapters, true);
  });

  it('should call the render handler', () => {
    const onRender$ = jest.fn();
    hook.rerender({ onRender$, expression: 'something' });
    act(() => expressionLoader.render$.next(1));

    expect(hook.result.current).toEqual({
      isEmpty: false,
      isLoading: false,
      error: null,
    });
    expect(onRender$).toHaveBeenCalledWith(1);
  });

  it('should not call the render handler when there is a custom error renderer', () => {
    const onRender$ = jest.fn();
    hook.rerender({ onRender$, expression: 'something', hasCustomErrorRenderer: true });

    expect(expressionLoaderSpy).toHaveBeenCalledTimes(1);

    const [[, , loaderParams]] = expressionLoaderSpy.mock.calls;
    act(() =>
      loaderParams?.onRenderError?.(document.createElement('div'), new Error('something'), {
        done: jest.fn(),
      } as unknown as IInterpreterRenderHandlers)
    );
    act(() => expressionLoader.render$.next(1));

    expect(hook.result.current).toEqual({
      isEmpty: false,
      isLoading: false,
      error: new Error('something'),
    });
    expect(onRender$).not.toHaveBeenCalled();
  });

  it('should update on reload', () => {
    const reload$ = new Subject();
    hook.rerender({ reload$, expression: 'something' });

    expect(expressionLoader.update).not.toHaveBeenCalled();
    reload$.next();
    expect(expressionLoader.update).toHaveBeenCalledWith('something', {});
  });
});
