import type { AggregateQuery, Query } from '@kbn/es-query';
export declare function getQueryLanguage(query: Query | AggregateQuery | undefined): string;
export declare function getQueryString(query: Query | AggregateQuery | undefined): string;
export declare function getQueryStringCharCount(queryString: string): number;
export declare function getQueryStringLineCount(queryString: string): number;
