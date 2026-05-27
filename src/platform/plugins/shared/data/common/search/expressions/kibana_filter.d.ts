import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { KibanaFilter } from './kibana_context_type';
interface Arguments {
    query: string;
    negate?: boolean;
    disabled?: boolean;
}
export type ExpressionFunctionKibanaFilter = ExpressionFunctionDefinition<'kibanaFilter', null, Arguments, KibanaFilter>;
export declare const kibanaFilterFunction: ExpressionFunctionKibanaFilter;
export {};
