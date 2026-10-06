import type { ExpressionFunctionDefinition } from '../types';
import type { MathArguments } from './math';
import type { Datatable } from '../../expression_types';
export type MathColumnArguments = MathArguments & {
    id: string;
    name?: string;
    castColumns?: string[];
    copyMetaFrom?: string | null;
};
export type ExpressionFunctionMathColumn = ExpressionFunctionDefinition<'mathColumn', Datatable, MathColumnArguments, Promise<Datatable>>;
export declare const mathColumn: ExpressionFunctionMathColumn;
