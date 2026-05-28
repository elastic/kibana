import React from 'react';
import type { ExpressionRenderError } from '../types';
import type { ExpressionRendererParams } from './use_expression_renderer';
export interface ReactExpressionRendererProps extends Omit<ExpressionRendererParams, 'hasCustomErrorRenderer'> {
    className?: string;
    dataAttrs?: string[];
    renderError?: (message?: string | null, error?: ExpressionRenderError | null) => React.ReactElement | React.ReactElement[];
    padding?: 'xs' | 's' | 'm' | 'l' | 'xl';
    paddingTop?: boolean;
}
export type ReactExpressionRendererType = React.ComponentType<ReactExpressionRendererProps>;
export type ExpressionRendererComponent = React.FC<ReactExpressionRendererProps>;
export declare function ReactExpressionRenderer({ className, dataAttrs, padding, paddingTop, renderError, abortController, ...expressionRendererOptions }: ReactExpressionRendererProps): React.JSX.Element;
