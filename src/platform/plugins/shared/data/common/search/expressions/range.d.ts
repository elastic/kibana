import type { ExpressionFunctionDefinition, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
interface Arguments {
    gt?: number | string;
    lt?: number | string;
    gte?: number | string;
    lte?: number | string;
}
export type KibanaRange = ExpressionValueBoxed<'kibana_range', Arguments>;
export type ExpressionFunctionRange = ExpressionFunctionDefinition<'range', null, Arguments, KibanaRange>;
export declare const rangeFunction: ExpressionFunctionRange;
export {};
