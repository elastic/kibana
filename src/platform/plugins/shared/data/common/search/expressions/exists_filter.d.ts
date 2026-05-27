import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { KibanaField, KibanaFilter } from './kibana_context_type';
interface Arguments {
    field: KibanaField;
    negate?: boolean;
}
export type ExpressionFunctionExistsFilter = ExpressionFunctionDefinition<'existsFilter', null, Arguments, KibanaFilter>;
export declare const existsFilterFunction: ExpressionFunctionExistsFilter;
export {};
