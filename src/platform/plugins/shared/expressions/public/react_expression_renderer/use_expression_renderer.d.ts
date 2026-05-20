import type { RefObject } from 'react';
import type { Observable } from 'rxjs';
import type { ExpressionAstExpression } from '../../common';
import type { IExpressionLoaderParams, ExpressionRenderError, ExpressionRendererEvent } from '../types';
export interface ExpressionRendererParams extends IExpressionLoaderParams {
    debounce?: number;
    expression: string | ExpressionAstExpression;
    hasCustomErrorRenderer?: boolean;
    onData$?<TData, TInspectorAdapters extends unknown>(data: TData, adapters?: TInspectorAdapters, partial?: boolean): void;
    onEvent?(event: ExpressionRendererEvent): void;
    onRender$?(item: number): void;
    /**
     * An observable which can be used to re-run the expression without destroying the component
     */
    reload$?: Observable<unknown>;
    abortController?: AbortController;
}
interface ExpressionRendererState {
    isEmpty: boolean;
    isLoading: boolean;
    error: null | ExpressionRenderError;
}
export declare function useExpressionRenderer(nodeRef: RefObject<HTMLElement>, { debounce, expression, hasCustomErrorRenderer, onData$, onEvent, onRender$, reload$, abortController, ...loaderParams }: ExpressionRendererParams): ExpressionRendererState;
export {};
