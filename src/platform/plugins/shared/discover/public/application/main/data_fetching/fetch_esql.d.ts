import type { Query, AggregateQuery, Filter, TimeRange, ProjectRouting } from '@kbn/es-query';
import type { Adapters } from '@kbn/inspector-plugin/common';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { RecordsFetchResponse } from '../../types';
import type { ScopedProfilesManager } from '../../../context_awareness';
export interface FetchEsqlParams {
    query: Query | AggregateQuery;
    inputQuery?: Query;
    filters?: Filter[];
    timeRange?: TimeRange;
    dataView: DataView;
    abortSignal?: AbortSignal;
    inspectorAdapters: Adapters;
    data: DataPublicPluginStart;
    expressions: ExpressionsStart;
    scopedProfilesManager: ScopedProfilesManager;
    esqlVariables?: ESQLControlVariable[];
    searchSessionId?: string;
    projectRouting?: ProjectRouting;
    inspectorConfig?: {
        title: string;
        description: string;
    };
}
export declare function fetchEsql({ query, inputQuery, filters, timeRange, dataView, abortSignal, inspectorAdapters, data, expressions, scopedProfilesManager, esqlVariables, searchSessionId, projectRouting, inspectorConfig, }: FetchEsqlParams): Promise<RecordsFetchResponse>;
export declare function getTextBasedQueryStateToAstProps({ query, inputQuery, filters, timeRange, dataView, data, inspectorConfig, }: {
    query: Query | AggregateQuery;
    inputQuery?: Query;
    filters?: Filter[];
    timeRange?: TimeRange;
    dataView: DataView;
    data: DataPublicPluginStart;
    inspectorConfig?: {
        title: string;
        description: string;
    };
}): {
    filters: Filter[] | undefined;
    query: Query | AggregateQuery;
    time: TimeRange;
    timeFieldName: string | undefined;
    inputQuery: Query | undefined;
    titleForInspector: string;
    descriptionForInspector: string;
};
