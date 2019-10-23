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
import { ExpressionAST, IExpressionLoaderParams, IInterpreterErrorResult } from './types';
import { ExpressionLoader } from './loader';

// Accept all options of the runner as props except for the
// dom element which is provided by the component itself
export interface ExpressionRendererProps extends IExpressionLoaderParams {
  className: string;
  dataAttrs?: string[];
  expression: string | ExpressionAST;
  renderError?: (error?: string | null) => React.ReactElement | React.ReactElement[];
}

interface State {
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
}

export type ExpressionRenderer = React.FC<ExpressionRendererProps>;

const defaultState: State = {
  isLoading: false,
  hasError: false,
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
  const [state, setState] = useState<State>({ ...defaultState });

  useEffect(() => {
    if (mountpoint.current) {
      if (!handlerRef.current) {
        handlerRef.current = new ExpressionLoader(mountpoint.current, expression, options);

        // Only registers one subscriber
        handlerRef.current.loading$.subscribe(() => {
          setState(prevState => ({ ...prevState, isLoading: true }));
        });
        handlerRef.current.render$.subscribe((item: number | IInterpreterErrorResult) => {
          if (item !== null && typeof item === 'object' && item.type === 'error') {
            setState(() => ({
              isLoading: false,
              hasError: true,
              errorMessage: item.error.message.toString(),
            }));
          } else {
            setState(() => ({
              ...defaultState,
              isLoading: false,
            }));
          }
        });
      } else {
        handlerRef.current.update(expression, options);
      }
    }

    return function cleanup() {
      // TODO: Cleanup run on every effect, which is not right. We want to clean up on unmount only
      //   if (handlerRef.current) {
      //     handlerRef.current.destroy();
      //     handlerRef.current = null;
      //   }
    };
  }, [
    expression,
    options.searchContext,
    options.context,
    options.variables,
    options.disableCaching,
    mountpoint.current,
  ]);

  const classes = classNames('expExpressionRenderer', className, {
    'expExpressionRenderer-isLoading': state.isLoading,
    'expExpressionRenderer-hasError': state.hasError,
  });

  return (
    <div {...dataAttrs} className={classes}>
      {state.isLoading ? (
        <>
          <EuiProgress size="xs" color="accent" position="absolute" />
          <EuiLoadingChart mono size="l" />
        </>
      ) : null}
      {!state.isLoading && state.hasError ? (
        options.renderError ? (
          options.renderError(state.errorMessage)
        ) : (
          <div data-test-subj="expression-renderer-error">{state.errorMessage}</div>
        )
      ) : null}
      <div className="expExpressionRenderer__expression" ref={mountpoint} />
    </div>
  );
};
