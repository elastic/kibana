import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { KibanaContext } from './kibana_context_type';
interface Arguments {
    group: string[];
    from?: string;
    ungrouped?: boolean;
}
export type ExpressionFunctionSelectFilter = ExpressionFunctionDefinition<'selectFilter', KibanaContext, Arguments, KibanaContext>;
export declare const selectFilterFunction: ExpressionFunctionSelectFilter;
export {};
