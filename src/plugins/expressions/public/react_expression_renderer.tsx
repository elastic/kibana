/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import classNames from 'classnames';
import { Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import useShallowCompareEffect from 'react-use/lib/useShallowCompareEffect';
import { EuiLoadingChart, EuiProgress } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { IExpressionLoaderParams, ExpressionRenderError } from './types';
import { ExpressionAstExpression, IInterpreterRenderHandlers } from '../common';
import { ExpressionLoader } from './loader';
import { ExpressionRendererEvent } from './render';

// Accept all options of the runner as props except for the
// dom element which is provided by the component itself
export interface ReactExpressionRendererProps extends IExpressionLoaderParams {
  className?: string;
  dataAttrs?: string[];
  expression: string | ExpressionAstExpression;
  renderError?: (
    message?: string | null,
    error?: ExpressionRenderError | null
  ) => React.ReactElement | React.ReactElement[];
  padding?: 'xs' | 's' | 'm' | 'l' | 'xl';
  onEvent?: (event: ExpressionRendererEvent) => void;
  onData$?: <TData, TInspectorAdapters>(
    data: TData,
    adapters?: TInspectorAdapters,
    partial?: boolean
  ) => void;
  /**
   * An observable which can be used to re-run the expression without destroying the component
   */
  reload$?: Observable<unknown>;
  debounce?: number;
}

export type ReactExpressionRendererType = React.ComponentType<ReactExpressionRendererProps>;

interface State {
  isEmpty: boolean;
  isLoading: boolean;
  error: null | ExpressionRenderError;
}

export type ExpressionRendererComponent = React.FC<ReactExpressionRendererProps>;

const defaultState: State = {
  isEmpty: true,
  isLoading: false,
  error: null,
};

export const ReactExpressionRenderer = ({
  className,
  dataAttrs,
  padding,
  renderError,
  expression,
  onEvent,
  onData$,
  reload$,
  debounce,
  ...expressionLoaderOptions
}: ReactExpressionRendererProps) => {
  const mountpoint: React.MutableRefObject<null | HTMLDivElement> = useRef(null);
  const [state, setState] = useState<State>({ ...defaultState });
  const hasCustomRenderErrorHandler = !!renderError;
  const expressionLoaderRef: React.MutableRefObject<null | ExpressionLoader> = useRef(null);
  // flag to skip next render$ notification,
  // because of just handled error
  const hasHandledErrorRef = useRef(false);

  // will call done() in LayoutEffect when done with rendering custom error state
  const errorRenderHandlerRef: React.MutableRefObject<null | IInterpreterRenderHandlers> =
    useRef(null);
  const [debouncedExpression, setDebouncedExpression] = useState(expression);
  const [waitingForDebounceToComplete, setDebouncePending] = useState(false);
  const firstRender = useRef(true);
  useShallowCompareEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (debounce === undefined) {
      return;
    }
    setDebouncePending(true);
    const handler = setTimeout(() => {
      setDebouncedExpression(expression);
      setDebouncePending(false);
    }, debounce);

    return () => {
      clearTimeout(handler);
    };
  }, [expression, expressionLoaderOptions, debounce]);

  const activeExpression = debounce !== undefined ? debouncedExpression : expression;

  /* eslint-disable react-hooks/exhaustive-deps */
  // OK to ignore react-hooks/exhaustive-deps because options update is handled by calling .update()
  useEffect(() => {
    const subs: Subscription[] = [];
    expressionLoaderRef.current = new ExpressionLoader(mountpoint.current!, activeExpression, {
      ...expressionLoaderOptions,
      // react component wrapper provides different
      // error handling api which is easier to work with from react
      // if custom renderError is not provided then we fallback to default error handling from ExpressionLoader
      onRenderError: hasCustomRenderErrorHandler
        ? (domNode, error, handlers) => {
            errorRenderHandlerRef.current = handlers;
            setState(() => ({
              ...defaultState,
              isEmpty: false,
              error,
            }));

            if (expressionLoaderOptions.onRenderError) {
              expressionLoaderOptions.onRenderError(domNode, error, handlers);
            }
          }
        : expressionLoaderOptions.onRenderError,
    });
    if (onEvent) {
      subs.push(
        expressionLoaderRef.current.events$.subscribe((event) => {
          onEvent(event);
        })
      );
    }
    if (onData$) {
      subs.push(
        expressionLoaderRef.current.data$.subscribe(({ partial, result }) => {
          onData$(result, expressionLoaderRef.current?.inspect(), partial);
        })
      );
    }
    subs.push(
      expressionLoaderRef.current.loading$.subscribe(() => {
        hasHandledErrorRef.current = false;
        setState((prevState) => ({ ...prevState, isLoading: true }));
      }),
      expressionLoaderRef.current.render$
        .pipe(filter(() => !hasHandledErrorRef.current))
        .subscribe((item) => {
          setState(() => ({
            ...defaultState,
            isEmpty: false,
          }));
        })
    );

    return () => {
      subs.forEach((s) => s.unsubscribe());
      if (expressionLoaderRef.current) {
        expressionLoaderRef.current.destroy();
        expressionLoaderRef.current = null;
      }

      errorRenderHandlerRef.current = null;
    };
  }, [
    hasCustomRenderErrorHandler,
    onEvent,
    expressionLoaderOptions.interactive,
    expressionLoaderOptions.renderMode,
    expressionLoaderOptions.syncColors,
  ]);

  useEffect(() => {
    const subscription = reload$?.subscribe(() => {
      if (expressionLoaderRef.current) {
        expressionLoaderRef.current.update(activeExpression, expressionLoaderOptions);
      }
    });
    return () => subscription?.unsubscribe();
  }, [reload$, activeExpression, ...Object.values(expressionLoaderOptions)]);

  // Re-fetch data automatically when the inputs change
  useShallowCompareEffect(
    () => {
      // only update the loader if the debounce period is over
      if (expressionLoaderRef.current && !waitingForDebounceToComplete) {
        expressionLoaderRef.current.update(activeExpression, expressionLoaderOptions);
      }
    },
    // when debounced, wait for debounce status to change to update loader.
    // Otherwise, update when expression is changed by reference and when any other loaderOption is changed by reference
    debounce === undefined
      ? [{ activeExpression, ...expressionLoaderOptions }]
      : [{ waitingForDebounceToComplete }]
  );

  /* eslint-enable react-hooks/exhaustive-deps */
  // call expression loader's done() handler when finished rendering custom error state
  useLayoutEffect(() => {
    if (state.error && errorRenderHandlerRef.current) {
      hasHandledErrorRef.current = true;
      errorRenderHandlerRef.current.done();
      errorRenderHandlerRef.current = null;
    }
  }, [state.error]);

  const classes = classNames('expExpressionRenderer', className, {
    'expExpressionRenderer-isEmpty': state.isEmpty,
    'expExpressionRenderer-hasError': !!state.error,
  });

  const expressionStyles: React.CSSProperties = {};

  if (padding) {
    expressionStyles.padding = theme.paddingSizes[padding];
  }

  return (
    <div {...dataAttrs} className={classes}>
      {state.isEmpty && <EuiLoadingChart mono size="l" />}
      {(state.isLoading || waitingForDebounceToComplete) && (
        <EuiProgress size="xs" color="accent" position="absolute" />
      )}
      {!state.isLoading &&
        state.error &&
        renderError &&
        renderError(state.error.message, state.error)}
      <div
        className="expExpressionRenderer__expression"
        style={expressionStyles}
        ref={mountpoint}
      />
    </div>
  );
};
