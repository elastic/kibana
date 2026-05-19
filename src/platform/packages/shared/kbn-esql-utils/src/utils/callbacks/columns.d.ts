import type { TimeRange } from '@kbn/es-query';
import type { ISearchGeneric } from '@kbn/search-types';
import type { ESQLControlVariable, ESQLFieldWithMetadata } from '@kbn/esql-types';
/**
 * Gets the columns of an ESQL query, formatted as ESQLFieldWithMetadata
 * @param esqlQuery The ESQL query to execute
 * @param search The search service to use
 * @param variables Optional ESQL control variables to substitute in the query
 * @param signal Optional AbortSignal to cancel the request
 * @param timeRange Optional time range for the query
 * @returns A promise that resolves to an array of ESQLFieldWithMetadata
 */
export declare const getEsqlColumns: ({ esqlQuery, search, variables, signal, timeRange, }: {
    search: ISearchGeneric;
    esqlQuery?: string;
    variables?: ESQLControlVariable[];
    signal?: AbortSignal;
    timeRange?: TimeRange;
}) => Promise<ESQLFieldWithMetadata[]>;
