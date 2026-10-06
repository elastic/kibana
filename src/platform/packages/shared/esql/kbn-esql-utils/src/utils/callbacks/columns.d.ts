import type { TimeRange } from '@kbn/es-query';
import type { ISearchGeneric } from '@kbn/search-types';
import type { HttpStart } from '@kbn/core/public';
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
/**
 * Same result as {@link getEsqlColumns}, fetched through the source info route whose cache
 * `EsqlSource` shares, so a `FROM x | LIMIT 0` is requested once per page.
 */
export declare const getEsqlSourceColumns: ({ esqlQuery, http, projectRouting, variables, timeRange, signal, }: {
    esqlQuery?: string;
    http: HttpStart;
    projectRouting?: string;
    variables?: ESQLControlVariable[];
    timeRange?: TimeRange;
    signal?: AbortSignal;
}) => Promise<ESQLFieldWithMetadata[]>;
