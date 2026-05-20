import type { Observable } from 'rxjs';
import type { SerializableRecord } from '@kbn/utility-types';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { ExpressionRenderError, RenderErrorHandlerFnType, IExpressionLoaderParams, ExpressionRendererEvent } from './types';
import type { IInterpreterRenderUpdateParams, RenderMode } from '../common';
export type IExpressionRendererExtraHandlers = Record<string, unknown>;
export interface ExpressionRenderHandlerParams {
    onRenderError?: RenderErrorHandlerFnType;
    renderMode?: RenderMode;
    syncColors?: boolean;
    syncCursor?: boolean;
    syncTooltips?: boolean;
    interactive?: boolean;
    hasCompatibleActions?: (event: ExpressionRendererEvent) => Promise<boolean>;
    getCompatibleCellValueActions?: (data: object[]) => Promise<unknown[]>;
    executionContext?: KibanaExecutionContext;
}
type UpdateValue = IInterpreterRenderUpdateParams<IExpressionLoaderParams>;
export declare class ExpressionRenderHandler {
    render$: Observable<number>;
    update$: Observable<UpdateValue | null>;
    events$: Observable<ExpressionRendererEvent>;
    private element;
    private destroyFn?;
    private renderCount;
    private renderSubject;
    private eventsSubject;
    private updateSubject;
    private handlers;
    private onRenderError;
    constructor(element: HTMLElement, { onRenderError, renderMode, syncColors, syncTooltips, syncCursor, interactive, hasCompatibleActions, getCompatibleCellValueActions, executionContext, }?: ExpressionRenderHandlerParams);
    render: (value: SerializableRecord, uiState?: unknown) => Promise<void>;
    destroy: () => void;
    getElement: () => HTMLElement;
    handleRenderError: (error: ExpressionRenderError) => void;
}
export type IExpressionRenderer = (element: HTMLElement, data: unknown, options?: ExpressionRenderHandlerParams) => Promise<ExpressionRenderHandler>;
export declare const render: IExpressionRenderer;
export {};
