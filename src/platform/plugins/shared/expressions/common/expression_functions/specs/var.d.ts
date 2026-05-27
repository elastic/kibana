import type { ExpressionFunctionDefinition } from '../types';
interface Arguments {
    name: string;
}
export type ExpressionFunctionVar = ExpressionFunctionDefinition<'var', unknown, Arguments, unknown>;
export declare const variable: ExpressionFunctionVar;
export {};
