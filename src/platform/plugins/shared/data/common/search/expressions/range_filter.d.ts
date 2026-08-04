import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { KibanaField, KibanaFilter } from './kibana_context_type';
import type { KibanaRange } from './range';
interface Arguments {
    field: KibanaField;
    range: KibanaRange;
    negate?: boolean;
}
export type ExpressionFunctionRangeFilter = ExpressionFunctionDefinition<'rangeFilter', null, Arguments, KibanaFilter>;
export declare const rangeFilterFunction: ExpressionFunctionRangeFilter;
export {};
