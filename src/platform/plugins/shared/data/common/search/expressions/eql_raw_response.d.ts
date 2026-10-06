import type { ExpressionTypeDefinition } from '@kbn/expressions-plugin/common';
import type { EqlSearchStrategyResponse } from '..';
declare const name = "eql_raw_response";
export interface EqlRawResponse {
    type: typeof name;
    body: EqlSearchStrategyResponse['rawResponse'];
}
export type SearchTypes = string | string[] | number | number[] | boolean | boolean[] | object | object[] | undefined;
export interface TotalValue {
    value: number;
    relation: string;
}
export interface BaseHit<T> {
    _index: string;
    _id: string;
    _source: T;
    fields?: Record<string, SearchTypes[]>;
}
export interface EqlSequence<T> {
    join_keys: SearchTypes[];
    events: Array<BaseHit<T>>;
}
export interface EqlSearchResponse<T> {
    is_partial: boolean;
    is_running: boolean;
    took: number;
    timed_out: boolean;
    hits: {
        total: TotalValue;
        sequences?: Array<EqlSequence<T>>;
        events?: Array<BaseHit<T>>;
    };
}
export type EqlRawResponseExpressionTypeDefinition = ExpressionTypeDefinition<typeof name, EqlRawResponse, EqlRawResponse>;
export declare const eqlRawResponse: EqlRawResponseExpressionTypeDefinition;
export {};
