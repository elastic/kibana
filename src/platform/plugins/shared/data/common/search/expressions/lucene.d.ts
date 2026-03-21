import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { KibanaQueryOutput } from './kibana_context_type';
interface Arguments {
    q: string;
}
export type ExpressionFunctionLucene = ExpressionFunctionDefinition<'lucene', null, Arguments, KibanaQueryOutput>;
export declare const luceneFunction: ExpressionFunctionLucene;
export {};
