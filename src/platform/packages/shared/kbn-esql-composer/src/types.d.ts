import type { ESQLAstQueryExpression, ESQLCommand } from '@elastic/esql/types';
export interface Command {
    body: string;
}
type StringToUnion<S> = S extends `${infer First}${infer Rest}` ? First | StringToUnion<Rest> : never;
type AlphaLower = StringToUnion<'abcdefghijklmnopqrstuvwxyz'>;
type AllowedParamChar = AlphaLower | Uppercase<AlphaLower> | StringToUnion<'0123456789'> | '_';
type ExtractSingleParam<S extends string, Acc extends string = ''> = S extends `${infer First}${infer Rest}` ? First extends AllowedParamChar ? ExtractSingleParam<Rest, `${Acc}${First}`> : [Acc, `${First}${Rest}`] : [Acc, ''];
export type ExtractNamedParamNames<S extends string, Acc extends string = never> = S extends `${infer _Before}\?${infer After}` ? ExtractNamedParamNames<After, Acc> : S extends `${infer _Before}?${infer After}` ? ExtractSingleParam<After> extends [infer Param extends string, infer Rest extends string] ? Param extends '' ? ExtractNamedParamNames<Rest, Acc> : ExtractNamedParamNames<Rest, Acc | Param> : Acc : Acc;
export type FieldValue = number | string | boolean | null;
export type NamedParameter<TQuery extends string = string> = Record<ExtractNamedParamNames<TQuery>, NonNullable<FieldValue>>;
export type Params<TQuery extends string = string> = NamedParameter<TQuery> | FieldValue;
export interface QueryPipeline {
    pipe: (...args: QueryOperator[]) => QueryPipeline;
    toString: () => string;
    asRequest: () => QueryRequest;
}
export interface Query {
    root: ESQLAstQueryExpression;
    commands: Array<ESQLCommand<string>>;
    params: Params[];
}
export interface QueryRequest {
    query: string;
    params: Params[];
}
export type QueryOperator = (sourceQuery: Query) => Query;
export {};
