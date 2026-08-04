import type { ExpressionFunctionDefinition, Datatable } from '@kbn/expressions-plugin/common';
import type { ExpressionValueVisDimension, ExpressionValueXYDimension } from '@kbn/chart-expressions-common';
interface Arguments {
    visDimension: ExpressionValueVisDimension;
    params: string;
    aggType: string;
    label: string;
}
export declare const xyDimension: () => ExpressionFunctionDefinition<"xydimension", Datatable | null, Arguments, ExpressionValueXYDimension>;
export {};
