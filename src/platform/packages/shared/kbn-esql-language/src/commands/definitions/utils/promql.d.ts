import type { ESQLAstPromqlCommand } from '@elastic/esql/types';
import { type PromQLFunctionDefinition, type PromQLFunctionParamType } from '../types';
export declare const getPromqlFunctionDefinition: (name: string | undefined) => PromQLFunctionDefinition | undefined;
export declare const getPromqlOperatorDefinition: (operator: string | undefined) => PromQLFunctionDefinition | undefined;
export declare function getPromqlFunctionParamTypes(name: string | undefined, paramIndex: number): PromQLFunctionParamType[];
export declare const getPromqlBinaryOperatorParamTypes: (operator: string, paramIndex: number) => PromQLFunctionParamType[];
export declare const isPromqlAcrossSeriesFunction: (name: string) => boolean;
export declare function getPreGroupedAggregationName(textBeforeCursor: string): string | undefined;
export declare function getIndexFromPromQLParams({ params, query, }: ESQLAstPromqlCommand): string | undefined;
