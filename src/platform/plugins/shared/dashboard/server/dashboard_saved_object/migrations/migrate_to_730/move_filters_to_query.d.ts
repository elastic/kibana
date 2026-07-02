import type { Filter, Query } from '@kbn/es-query';
export interface Pre600FilterQuery {
    query: {
        query_string?: {
            query: string;
        } & {
            [key: string]: unknown;
        };
    };
}
export interface SearchSourcePre600 {
    filter?: Array<Filter | Pre600FilterQuery>;
}
export interface SearchSource730 {
    filter: Filter[];
    query: Query;
    highlightAll?: boolean;
    version?: boolean;
}
export declare function moveFiltersToQuery(searchSource: SearchSourcePre600 | SearchSource730): SearchSource730;
