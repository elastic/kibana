import type { ExpressionFunctionDefinition } from '../types';
interface Arguments {
    variable: string;
    default?: string | number | boolean;
}
type Output = unknown;
export type ExpressionFunctionTheme = ExpressionFunctionDefinition<'theme', null, Arguments, Output>;
export declare const theme: ExpressionFunctionTheme;
export {};
