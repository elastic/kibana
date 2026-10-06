import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { KibanaContext } from './kibana_context_type';
interface Arguments {
    group?: string;
    from?: string;
    ungrouped?: boolean;
}
export type ExpressionFunctionRemoveFilter = ExpressionFunctionDefinition<'removeFilter', KibanaContext, Arguments, KibanaContext>;
export declare const removeFilterFunction: ExpressionFunctionRemoveFilter;
export {};
