import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { AggregateQuery, Filter, ProjectRouting, Query, TimeRange } from '@kbn/es-query';
import type { ExpressionRendererEvent, ExpressionRendererParams } from '@kbn/expressions-plugin/public';
import type { VisParams } from '../types';
import type { Vis } from '../vis';
interface GetExpressionRendererPropsParams {
    unifiedSearch: {
        filters?: Filter[];
        query?: Query | AggregateQuery;
    };
    projectRouting?: ProjectRouting;
    timeRange?: TimeRange;
    disableTriggers?: boolean;
    settings: {
        syncColors?: boolean;
        syncCursor?: boolean;
        syncTooltips?: boolean;
    };
    parentExecutionContext?: KibanaExecutionContext;
    searchSessionId?: string;
    abortController?: AbortController;
    vis: Vis<VisParams>;
    timeslice?: [number, number];
    onRender: (renderCount: number) => void;
    onEvent: (event: ExpressionRendererEvent) => void;
    onData: ExpressionRendererParams['onData$'];
}
export declare const getExpressionRendererProps: (params: GetExpressionRendererPropsParams) => Promise<{
    abortController: AbortController;
    params: ExpressionRendererParams | null;
}>;
export {};
