import type { ExpressionTypeDefinition, ExpressionValueBoxed } from '../types';
/**
 * Represents an object that is a Filter.
 */
export type ExpressionValueFilter = ExpressionValueBoxed<'filter', {
    filterType?: string;
    filterGroup?: string;
    value?: string;
    column?: string;
    and: ExpressionValueFilter[];
    to?: string;
    from?: string;
    query?: string | null;
}>;
export declare const filter: ExpressionTypeDefinition<'filter', ExpressionValueFilter>;
