import type { Query, AggregateQuery } from '../filters';
type Language = keyof AggregateQuery;
export declare function isOfQueryType(arg?: Query | AggregateQuery): arg is Query;
export declare function isOfAggregateQueryType(query?: AggregateQuery | Query | {
    [key: string]: any;
}): query is AggregateQuery;
export declare function getAggregateQueryMode(query: AggregateQuery): Language;
export declare function getLanguageDisplayName(language?: string): string;
export {};
