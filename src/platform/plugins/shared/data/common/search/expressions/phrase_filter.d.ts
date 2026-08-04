import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { KibanaField, KibanaFilter } from './kibana_context_type';
interface Arguments {
    field: KibanaField;
    phrase: string[];
    negate?: boolean;
}
export type ExpressionFunctionPhraseFilter = ExpressionFunctionDefinition<'phraseFilter', null, Arguments, KibanaFilter>;
export declare const phraseFilterFunction: ExpressionFunctionPhraseFilter;
export {};
