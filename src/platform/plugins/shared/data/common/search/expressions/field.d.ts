import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { KibanaField } from './kibana_context_type';
interface Arguments {
    name: string;
    type: string;
    script?: string;
}
export type ExpressionFunctionField = ExpressionFunctionDefinition<'field', null, Arguments, KibanaField>;
export declare const fieldFunction: ExpressionFunctionField;
export {};
