import type { ExpressionFunctionDefinition } from '../types';
import type { Datatable } from '../../expression_types';
export type MathArguments = {
    expression: string;
    onError?: 'null' | 'zero' | 'false' | 'throw';
};
export type MathInput = number | Datatable;
export declare const math: ExpressionFunctionDefinition<'math', MathInput, MathArguments, Promise<boolean | number | null>>;
