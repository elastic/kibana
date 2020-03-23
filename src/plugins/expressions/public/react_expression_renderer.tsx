/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import React from 'react';
import classNames from 'classnames';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import useShallowCompareEffect from 'react-use/lib/useShallowCompareEffect';
import { EuiLoadingChart, EuiProgress } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { IExpressionLoaderParams, RenderError } from './types';
import { ExpressionAstExpression, IInterpreterRenderHandlers } from '../common';
import { ExpressionLoader } from './loader';

// Accept all options of the runner as props except for the
// dom element which is provided by the component itself
export interface ReactExpressionRendererProps extends IExpressionLoaderParams {
  className?: string;
  dataAttrs?: string[];
  expression: string | ExpressionAstExpression;
  renderError?: (error?: string | null) => React.ReactElement | React.ReactElement[];
  padding?: 'xs' | 's' | 'm' | 'l' | 'xl';
}

export type ReactExpressionRendererType = React.ComponentType<ReactExpressionRendererProps>;

interface State {
  isEmpty: boolean;
  isLoading: boolean;
  error: null | RenderError;
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
  const errorRenderHandlerRef: React.MutableRefObject<null | IInterpreterRenderHandlers> = useRef(
    null
  );

  /* eslint-disable react-hooks/exhaustive-deps */
  // OK to ignore react-hooks/exhaustive-deps because options update is handled by calling .update()
  useEffect(() => {
    const subs: Subscription[] = [];
    expressionLoaderRef.current = new ExpressionLoader(mountpoint.current!, expression, {
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
    subs.push(
      expressionLoaderRef.current.loading$.subscribe(() => {
        hasHandledErrorRef.current = false;
        setState(prevState => ({ ...prevState, isLoading: true }));
      }),
      expressionLoaderRef.current.render$
        .pipe(filter(() => !hasHandledErrorRef.current))
        .subscribe(item => {
          setState(() => ({
            ...defaultState,
            isEmpty: false,
          }));
        })
    );

    return () => {
      subs.forEach(s => s.unsubscribe());
      if (expressionLoaderRef.current) {
        expressionLoaderRef.current.destroy();
        expressionLoaderRef.current = null;
      }

      errorRenderHandlerRef.current = null;
    };
  }, [hasCustomRenderErrorHandler]);

  // Re-fetch data automatically when the inputs change
  useShallowCompareEffect(
    () => {
      if (expressionLoaderRef.current) {
        expressionLoaderRef.current.update(expression, expressionLoaderOptions);
      }
    },
    // when expression is changed by reference and when any other loaderOption is changed by reference
    [{ expression, ...expressionLoaderOptions }]
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

  const classes = classNames('expExpressionRenderer', {
    'expExpressionRenderer-isEmpty': state.isEmpty,
    'expExpressionRenderer-hasError': !!state.error,
    className,
  });

  const expressionStyles: React.CSSProperties = {};

  if (padding) {
    expressionStyles.padding = theme.paddingSizes[padding];
  }

  return (
    <div {...dataAttrs} className={classes}>
      {state.isEmpty && <EuiLoadingChart mono size="l" />}
      {state.isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
      {!state.isLoading && state.error && renderError && renderError(state.error.message)}
      <div
        className="expExpressionRenderer__expression"
        style={expressionStyles}
        ref={mountpoint}
      />
    </div>
  );
};
