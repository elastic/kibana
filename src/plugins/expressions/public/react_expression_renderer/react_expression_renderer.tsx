/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef } from 'react';
import classNames from 'classnames';
import { EuiLoadingChart, EuiProgress } from '@elastic/eui';
import { euiLightVars as theme } from '@kbn/ui-theme';
import { ExpressionRenderError } from '../types';
import type { ExpressionRendererParams } from './use_expression_renderer';
import { useExpressionRenderer } from './use_expression_renderer';

// Accept all options of the runner as props except for the
// dom element which is provided by the component itself
export interface ReactExpressionRendererProps
  extends Omit<ExpressionRendererParams, 'hasCustomErrorRenderer'> {
  className?: string;
  dataAttrs?: string[];
  renderError?: (
    message?: string | null,
    error?: ExpressionRenderError | null
  ) => React.ReactElement | React.ReactElement[];
  padding?: 'xs' | 's' | 'm' | 'l' | 'xl';
}

export type ReactExpressionRendererType = React.ComponentType<ReactExpressionRendererProps>;
export type ExpressionRendererComponent = React.FC<ReactExpressionRendererProps>;

export function ReactExpressionRenderer({
  className,
  dataAttrs,
  padding,
  renderError,
  ...expressionRendererOptions
}: ReactExpressionRendererProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const { error, isEmpty, isLoading } = useExpressionRenderer(nodeRef, {
    ...expressionRendererOptions,
    hasCustomErrorRenderer: !!renderError,
  });

  const classes = classNames('expExpressionRenderer', className, {
    'expExpressionRenderer-isEmpty': isEmpty,
    'expExpressionRenderer-hasError': !!error,
  });

  const expressionStyles: React.CSSProperties = {};

  if (padding) {
    expressionStyles.padding = theme.paddingSizes[padding];
  }

  return (
    <div {...dataAttrs} className={classes}>
      {isEmpty && <EuiLoadingChart mono size="l" />}
      {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
      {!isLoading && error && renderError?.(error.message, error)}
      <div className="expExpressionRenderer__expression" style={expressionStyles} ref={nodeRef} />
    </div>
  );
}
