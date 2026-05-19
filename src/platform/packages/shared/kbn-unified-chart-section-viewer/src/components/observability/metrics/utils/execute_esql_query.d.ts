import type { Filter, TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { getESQLResults } from '@kbn/esql-utils';
export interface ExecuteEsqlParams {
    esqlQuery: string;
    search: ISearchGeneric;
    signal?: AbortSignal;
    dataView: DataView;
    timeRange?: TimeRange;
    filters?: Filter[];
    variables?: ESQLControlVariable[];
    uiSettings: IUiSettingsClient;
}
export declare const fetchEsqlResponseOrThrow: (params: Parameters<typeof getESQLResults>[0]) => Promise<Awaited<ReturnType<typeof getESQLResults>>>;
export interface ExecuteEsqlResult<TDocument> {
    documents: TDocument[];
    rawResponse: object;
    requestParams: {
        query: string;
        filter?: object;
    };
}
/**
 * Executes an ES|QL query using the data plugin's search service.
 * Rejects when Elasticsearch returns a response body that contains an `error` object.
 */
export declare function executeEsqlQuery<TDocument extends object = Record<string, unknown>>({ esqlQuery, search, signal, dataView, timeRange, filters, variables, uiSettings, }: ExecuteEsqlParams): Promise<ExecuteEsqlResult<TDocument>>;
