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

import { useRef, useEffect, useState } from 'react';
import React from 'react';
import classNames from 'classnames';
import { EuiLoadingChart, EuiProgress } from '@elastic/eui';
import { ExpressionAST, IExpressionLoaderParams } from './types';
import { ExpressionLoader } from './loader';

// Accept all options of the runner as props except for the
// dom element which is provided by the component itself
export interface ExpressionRendererProps extends IExpressionLoaderParams {
  className: string;
  dataAttrs?: string[];
  expression: string | ExpressionAST;
  renderError?: (
    errorType: 'data' | 'render',
    error?: string | null
  ) => React.ReactElement | React.ReactElement[];
}

interface State {
  isLoading: boolean;
  hasError: boolean;
  errorType: 'data' | 'render' | null;
  errorMessage: string | null;
}

export type ExpressionRenderer = React.FC<ExpressionRendererProps>;

const defaultState: State = {
  isLoading: false,
  hasError: false,
  errorType: null,
  errorMessage: null,
};

export const ExpressionRendererImplementation = ({
  className,
  dataAttrs,
  expression,
  ...options
}: ExpressionRendererProps) => {
  const mountpoint: React.MutableRefObject<null | HTMLDivElement> = useRef(null);
  const handlerRef: React.MutableRefObject<null | ExpressionLoader> = useRef(null);
  const [state, setState] = useState<State>(defaultState);

  useEffect(() => {
    if (mountpoint.current) {
      if (!handlerRef.current) {
        handlerRef.current = new ExpressionLoader(mountpoint.current, expression, options);

        // Only registers one subscriber
        handlerRef.current.loading$.subscribe({
          next: () => {
            setState(prevState => ({ ...prevState, isLoading: true }));
          },
        });
        handlerRef.current.data$.subscribe({
          next: () => {
            setState(defaultState);
          },
          error: err => {
            setState(prevState => ({
              ...prevState,
              isLoading: false,
              hasError: true,
              errorType: 'data',
              errorMessage: err.toString(),
            }));
          },
        });
        handlerRef.current.render$.subscribe({
          next: () => {
            setState(() => ({
              ...defaultState,
              isLoading: false,
            }));
          },
          error: err => {
            setState(prevState => ({
              ...prevState,
              isLoading: false,
              hasError: true,
              errorType: 'render',
              errorMessage: err.toString(),
            }));
          },
        });
      } else {
        handlerRef.current.update(expression, options);
      }
    }
  }, [
    expression,
    options.searchContext,
    options.context,
    options.variables,
    options.disableCaching,
    mountpoint.current,
  ]);

  const classes = classNames('expExpressionRenderer', className);

  return (
    <div {...dataAttrs} className={classes}>
      {false ? ( // TODO: Hook this up to show if there is no chart at all but it is loading, so there's no blank area
        <EuiLoadingChart mono />
      ) : (
        <>
          {state.isLoading ? <EuiProgress size="xs" color="accent" position="absolute" /> : null}
          {state.hasError && state.errorType ? (
            options.renderError ? (
              options.renderError(state.errorType, state.errorMessage)
            ) : (
              <div data-test-subj="expression-renderer-error">{state.errorMessage}</div>
            )
          ) : null}
          <div className="expExpressionRenderer__expression" ref={mountpoint} />
        </>
      )}
    </div>
  );
};
