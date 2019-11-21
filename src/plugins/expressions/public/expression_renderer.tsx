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
import { EuiLoadingChart, EuiProgress } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { IExpressionLoaderParams, IInterpreterRenderHandlers, RenderError } from './types';
import { ExpressionAST } from '../common/types';
import { ExpressionLoader } from './loader';

// Accept all options of the runner as props except for the
// dom element which is provided by the component itself
export interface ExpressionRendererProps extends IExpressionLoaderParams {
  className?: string;
  dataAttrs?: string[];
  expression: string | ExpressionAST;
  renderError?: (error?: string | null) => React.ReactElement | React.ReactElement[];
  padding?: 'xs' | 's' | 'm' | 'l' | 'xl';
}

interface State {
  isEmpty: boolean;
  isLoading: boolean;
  error: null | RenderError;
}

export type ExpressionRenderer = React.FC<ExpressionRendererProps>;

const defaultState: State = {
  isEmpty: true,
  isLoading: false,
  error: null,
};

export const ExpressionRendererImplementation = ({
  className,
  dataAttrs,
  expression,
  renderError,
  padding,
  ...options
}: ExpressionRendererProps) => {
  const mountpoint: React.MutableRefObject<null | HTMLDivElement> = useRef(null);
  const handlerRef: React.MutableRefObject<null | ExpressionLoader> = useRef(null);
  const [state, setState] = useState<State>({ ...defaultState });

  // Re-fetch data automatically when the inputs change
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (handlerRef.current) {
      handlerRef.current.update(expression, options);
    }
  }, [
    expression,
    options.searchContext,
    options.context,
    options.variables,
    options.disableCaching,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // flag to skip next render$ notification,
  // because of just handled error
  const hasHandledErrorRef = useRef(false);

  // will call done() in LayoutEffect when done with rendering custom error state
  const errorRenderHandlerRef: React.MutableRefObject<null | IInterpreterRenderHandlers> = useRef(
    null
  );
  // Initialize the loader only once
  useEffect(() => {
    if (handlerRef.current) return;
    const subs: Subscription[] = [];

    handlerRef.current = new ExpressionLoader(mountpoint.current!, expression, {
      ...options,
      // react component wrapper provides different
      // error handling api which is easier to work with from react
      // if custom renderError is not provided then we fallback to default error handling from ExpressionLoader
      // TODO: track renderError prop change as dep?
      onRenderError:
        renderError &&
        ((domNode, error, handlers) => {
          errorRenderHandlerRef.current = handlers;
          setState(() => ({
            ...defaultState,
            isEmpty: false,
            error,
          }));
        }),
    });
    subs.push(
      handlerRef.current.loading$.subscribe(() => {
        hasHandledErrorRef.current = false;
        setState(prevState => ({ ...prevState, isLoading: true }));
      }),
      handlerRef.current.render$.pipe(filter(() => !hasHandledErrorRef.current)).subscribe(item => {
        setState(() => ({
          ...defaultState,
          isEmpty: false,
        }));
      })
    );

    return () => {
      subs.forEach(s => s.unsubscribe());
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
      errorRenderHandlerRef.current = null;
    };

    /* eslint-disable react-hooks/exhaustive-deps */
  }, []);
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
      {state.isEmpty ? <EuiLoadingChart mono size="l" /> : null}
      {state.isLoading ? <EuiProgress size="xs" color="accent" position="absolute" /> : null}
      {!state.isLoading && state.error && renderError && renderError(state.error.message)}
      <div
        className="expExpressionRenderer__expression"
        style={expressionStyles}
        ref={mountpoint}
      />
    </div>
  );
};
