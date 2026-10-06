/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { ExpressionRenderError } from '../types';
import type { ExpressionRendererParams } from './use_expression_renderer';
export interface ReactExpressionRendererProps
  extends Omit<ExpressionRendererParams, 'hasCustomErrorRenderer'> {
  className?: string;
  dataAttrs?: string[];
  renderError?: (
    message?: string | null,
    error?: ExpressionRenderError | null
  ) => React.ReactElement | React.ReactElement[];
  padding?: 'xs' | 's' | 'm' | 'l' | 'xl';
  paddingTop?: boolean;
}
export type ReactExpressionRendererType = React.ComponentType<ReactExpressionRendererProps>;
export type ExpressionRendererComponent = React.FC<ReactExpressionRendererProps>;
export declare function ReactExpressionRenderer({
  className,
  dataAttrs,
  padding,
  paddingTop,
  renderError,
  abortController,
  ...expressionRendererOptions
}: ReactExpressionRendererProps): React.JSX.Element;
