export interface DslQueryStringQuery {
    query_string: {
        query: string;
        analyze_wildcard?: boolean;
    };
}
/** @internal */
export declare const isEsQueryString: (query: any) => query is DslQueryStringQuery;
