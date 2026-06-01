import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import type { TimeRange } from '@kbn/es-query';
import type { ESQLColumn, ESQLSearchResponse, ESQLSearchParams } from '@kbn/es-types';
import { type ESQLControlVariable } from '@kbn/esql-types';
export declare const hasStartEndParams: (query: string) => boolean;
export declare const getStartEndParams: (query: string, time?: TimeRange) => ({
    _tstart: string;
    _tend?: undefined;
} | {
    _tend: string;
    _tstart?: undefined;
})[];
export declare const getNamedParams: (query: string, timeRange?: TimeRange, variables?: ESQLControlVariable[]) => Record<string, string | number | (string | number)[] | Record<string, string | number> | undefined>[];
export declare function formatESQLColumns(columns: ESQLColumn[]): DatatableColumn[];
export declare function getESQLQueryColumnsRaw({ esqlQuery, search, signal, filter, dropNullColumns, timeRange, variables, }: {
    esqlQuery: string;
    search: ISearchGeneric;
    signal?: AbortSignal;
    dropNullColumns?: boolean;
    filter?: unknown;
    timeRange?: TimeRange;
    variables?: ESQLControlVariable[];
}): Promise<ESQLColumn[]>;
export declare function getESQLQueryColumns({ esqlQuery, search, signal, filter, dropNullColumns, timeRange, variables, }: {
    esqlQuery: string;
    search: ISearchGeneric;
    signal?: AbortSignal;
    filter?: unknown;
    dropNullColumns?: boolean;
    timeRange?: TimeRange;
    variables?: ESQLControlVariable[];
}): Promise<DatatableColumn[]>;
export declare function getESQLResults({ esqlQuery, search, signal, filter, dropNullColumns, timeRange, variables, timezone, executionContext, }: {
    esqlQuery: string;
    search: ISearchGeneric;
    signal?: AbortSignal;
    filter?: unknown;
    dropNullColumns?: boolean;
    timeRange?: TimeRange;
    variables?: ESQLControlVariable[];
    timezone?: string;
    executionContext?: KibanaExecutionContext;
}): Promise<{
    response: ESQLSearchResponse;
    params: ESQLSearchParams;
}>;
