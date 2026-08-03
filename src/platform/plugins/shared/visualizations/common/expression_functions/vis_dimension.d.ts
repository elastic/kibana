import type { ExpressionFunctionDefinition, Datatable } from '@kbn/expressions-plugin/common';
import { type ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
export interface Arguments {
    accessor: string | number;
    format?: string;
    formatParams?: string;
}
export type ExpressionFunctionVisDimension = ExpressionFunctionDefinition<'visdimension', Datatable, Arguments, ExpressionValueVisDimension>;
export declare const visDimension: () => ExpressionFunctionVisDimension;
