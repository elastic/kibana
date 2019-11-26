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
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { IExpressionLoaderParams } from './types';
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
  error: null | { message: string };
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

  // Initialize the loader only once
  useEffect(() => {
    if (mountpoint.current && !handlerRef.current) {
      handlerRef.current = new ExpressionLoader(mountpoint.current, expression, options);

      handlerRef.current.loading$.subscribe(() => {
        if (!handlerRef.current) {
          return;
        }
        setState(prevState => ({ ...prevState, isLoading: true }));
      });
      handlerRef.current.render$.subscribe(item => {
        if (!handlerRef.current) {
          return;
        }
        if (typeof item !== 'number') {
          setState(() => ({
            ...defaultState,
            isEmpty: false,
            error: item.error,
          }));
        } else {
          setState(() => ({
            ...defaultState,
            isEmpty: false,
          }));
        }
      });
    }
  /* eslint-disable */
  // TODO: Replace mountpoint.current by something else.
  }, [mountpoint.current]);
  /* eslint-enable */

  useEffect(() => {
    // We only want a clean up to run when the entire component is unloaded, not on every render
    return function cleanup() {
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
    };
  }, []);

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
      {!state.isLoading && state.error ? (
        renderError ? (
          renderError(state.error.message)
        ) : (
          <div data-test-subj="expression-renderer-error">{state.error.message}</div>
        )
      ) : null}
      <div
        className="expExpressionRenderer__expression"
        style={expressionStyles}
        ref={mountpoint}
      />
    </div>
  );
};
