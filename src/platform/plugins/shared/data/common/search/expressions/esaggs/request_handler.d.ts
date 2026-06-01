import type { KibanaExecutionContext } from '@kbn/core/public';
import type { Adapters } from '@kbn/inspector-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter, ProjectRouting, TimeRange } from '@kbn/es-query';
import type { Query } from '../../..';
import type { IAggConfigs } from '../../aggs';
import type { ISearchStartSearchSource } from '../../search_source';
export interface RequestHandlerParams {
    abortSignal?: AbortSignal;
    aggs: IAggConfigs;
    filters?: Filter[];
    indexPattern?: DataView;
    inspectorAdapters: Adapters;
    query?: Query;
    searchSessionId?: string;
    searchSourceService: ISearchStartSearchSource;
    timeFields?: string[];
    timeRange?: TimeRange;
    disableWarningToasts?: boolean;
    getNow?: () => Date;
    executionContext?: KibanaExecutionContext;
    title?: string;
    description?: string;
    projectRouting?: ProjectRouting;
}
export declare const handleRequest: ({ abortSignal, aggs, filters, indexPattern, inspectorAdapters, query, searchSessionId, searchSourceService, timeFields, timeRange, disableWarningToasts, getNow, executionContext, title, description, projectRouting, }: RequestHandlerParams) => import("rxjs").Observable<import("../../../../../expressions/common").Datatable>;
