/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RefObject } from 'react';
import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import { ExpressionAstExpression, IInterpreterRenderHandlers } from '../../common';
import { ExpressionLoader } from '../loader';
import { IExpressionLoaderParams, ExpressionRenderError, ExpressionRendererEvent } from '../types';
import { useDebouncedValue } from './use_debounced_value';
import { useShallowMemo } from './use_shallow_memo';

export interface ExpressionRendererParams extends IExpressionLoaderParams {
  debounce?: number;
  expression: string | ExpressionAstExpression;
  hasCustomErrorRenderer?: boolean;
  onData$?<TData, TInspectorAdapters>(
    data: TData,
    adapters?: TInspectorAdapters,
    partial?: boolean
  ): void;
  onEvent?(event: ExpressionRendererEvent): void;
  onRender$?(item: number): void;
  /**
   * An observable which can be used to re-run the expression without destroying the component
   */
  reload$?: Observable<unknown>;
}

interface ExpressionRendererState {
  isEmpty: boolean;
  isLoading: boolean;
  error: null | ExpressionRenderError;
}

export function useExpressionRenderer(
  nodeRef: RefObject<HTMLElement>,
  {
    debounce,
    expression,
    hasCustomErrorRenderer,
    onData$,
    onEvent,
    onRender$,
    reload$,
    ...loaderParams
  }: ExpressionRendererParams
): ExpressionRendererState {
  const [isEmpty, setEmpty] = useState(true);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<null | ExpressionRenderError>(null);

  const memoizedOptions = useShallowMemo({ expression, params: useShallowMemo(loaderParams) });
  const [{ expression: debouncedExpression, params: debouncedLoaderParams }, isDebounced] =
    useDebouncedValue(memoizedOptions, debounce);

  const expressionLoaderRef = useRef<ExpressionLoader | null>(null);

  // flag to skip next render$ notification,
  // because of just handled error
  const hasHandledErrorRef = useRef(false);
  // will call done() in LayoutEffect when done with rendering custom error state
  const errorRenderHandlerRef = useRef<IInterpreterRenderHandlers | null>(null);

  /* eslint-disable react-hooks/exhaustive-deps */
  // OK to ignore react-hooks/exhaustive-deps because options update is handled by calling .update()
  useEffect(() => {
    expressionLoaderRef.current =
      nodeRef.current &&
      new ExpressionLoader(nodeRef.current, debouncedExpression, {
        ...debouncedLoaderParams,
        // react component wrapper provides different
        // error handling api which is easier to work with from react
        // if custom renderError is not provided then we fallback to default error handling from ExpressionLoader
        onRenderError: (domNode, newError, handlers) => {
          errorRenderHandlerRef.current = handlers;
          setEmpty(false);
          setError(newError);
          setLoading(false);

          return debouncedLoaderParams.onRenderError?.(domNode, newError, handlers);
        },
      });

    const subscription = expressionLoaderRef.current?.loading$.subscribe(() => {
      hasHandledErrorRef.current = false;
      setLoading(true);
    });

    return () => {
      subscription?.unsubscribe();
      expressionLoaderRef.current?.destroy();
      expressionLoaderRef.current = null;
      errorRenderHandlerRef.current = null;
    };
  }, [
    debouncedLoaderParams.onRenderError,
    debouncedLoaderParams.interactive,
    debouncedLoaderParams.renderMode,
    debouncedLoaderParams.syncColors,
  ]);

  useEffect(() => {
    const subscription = onEvent && expressionLoaderRef.current?.events$.subscribe(onEvent);

    return () => subscription?.unsubscribe();
  }, [expressionLoaderRef.current, onEvent]);

  useEffect(() => {
    const subscription =
      onData$ &&
      expressionLoaderRef.current?.data$.subscribe(({ partial, result }) => {
        onData$(result, expressionLoaderRef.current?.inspect(), partial);
      });

    return () => subscription?.unsubscribe();
  }, [expressionLoaderRef.current, onData$]);

  useEffect(() => {
    const subscription = expressionLoaderRef.current?.render$
      .pipe(filter(() => !hasHandledErrorRef.current))
      .subscribe((item) => {
        setEmpty(false);
        setError(null);
        setLoading(false);
        onRender$?.(item);
      });

    return () => subscription?.unsubscribe();
  }, [expressionLoaderRef.current, onRender$]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const subscription = reload$?.subscribe(() => {
      expressionLoaderRef.current?.update(debouncedExpression, debouncedLoaderParams);
    });

    return () => subscription?.unsubscribe();
  }, [reload$, debouncedExpression, debouncedLoaderParams]);

  useUpdateEffect(() => {
    expressionLoaderRef.current?.update(debouncedExpression, debouncedLoaderParams);
  }, [debouncedExpression, debouncedLoaderParams]);

  // call expression loader's done() handler when finished rendering custom error state
  useLayoutEffect(() => {
    if (error && hasCustomErrorRenderer) {
      hasHandledErrorRef.current = true;
      errorRenderHandlerRef.current?.done();
    }

    errorRenderHandlerRef.current = null;
  }, [error, hasCustomErrorRenderer]);

  return {
    error,
    isEmpty,
    isLoading: isLoading || isDebounced,
  };
}
