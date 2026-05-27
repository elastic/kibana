import type { estypes } from '@elastic/elasticsearch';
import type { ExpressionTypeDefinition } from '@kbn/expressions-plugin/common';
declare const name = "es_raw_response";
export interface EsRawResponse<T = unknown> {
    type: typeof name;
    body: estypes.SearchResponse<T>;
}
export type EsRawResponseExpressionTypeDefinition = ExpressionTypeDefinition<typeof name, EsRawResponse, EsRawResponse>;
export declare const esRawResponse: EsRawResponseExpressionTypeDefinition;
export {};
