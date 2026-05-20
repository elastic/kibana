import type { EsqlQueryRequest, FieldCapsRequest, FieldCapsResponse, MsearchRequest, ScalarValue } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import type { Required, ValuesType } from 'utility-types';
import type { DedotObject } from '@kbn/utility-types';
type SearchRequest = ESSearchRequest & {
    index: string | string[];
    track_total_hits: number | boolean;
    size: number;
};
export interface EsqlOptions {
    transform?: 'none' | 'plain' | 'unflatten';
}
export type EsqlValue = ScalarValue | ScalarValue[];
export type EsqlOutput = Record<string, EsqlValue>;
type MaybeUnflatten<T extends Record<string, any>, TApply> = TApply extends true ? DedotObject<T> : T;
interface UnparsedEsqlResponseOf<TOutput extends EsqlOutput> {
    columns: Array<{
        name: keyof TOutput;
        type: string;
    }>;
    values: Array<Array<ValuesType<TOutput>>>;
}
interface ParsedEsqlResponseOf<TOutput extends EsqlOutput, TOptions extends EsqlOptions | undefined = {
    transform: 'none';
}> {
    hits: Array<MaybeUnflatten<{
        [key in keyof TOutput]: TOutput[key];
    }, TOptions extends {
        transform: 'unflatten';
    } ? true : false>>;
}
export type InferEsqlResponseOf<TOutput extends EsqlOutput, TOptions extends EsqlOptions | undefined = {
    transform: 'none';
}> = TOptions extends {
    transform: 'plain' | 'unflatten';
} ? ParsedEsqlResponseOf<TOutput, TOptions> : UnparsedEsqlResponseOf<TOutput>;
export type ObservabilityESSearchRequest = SearchRequest;
export type ObservabilityEsQueryRequest = Omit<EsqlQueryRequest, 'format' | 'columnar'>;
export type ParsedEsqlResponse = ParsedEsqlResponseOf<EsqlOutput, EsqlOptions>;
export type UnparsedEsqlResponse = UnparsedEsqlResponseOf<EsqlOutput>;
export type EsqlQueryResponse = UnparsedEsqlResponse | ParsedEsqlResponse;
/**
 * An Elasticsearch Client with a fully typed `search` method and built-in
 * APM instrumentation.
 */
export interface TracedElasticsearchClient {
    search<TDocument = unknown, TSearchRequest extends SearchRequest = SearchRequest>(operationName: string, parameters: TSearchRequest): Promise<InferSearchResponseOf<TDocument, TSearchRequest, {
        restTotalHitsAsInt: false;
    }>>;
    msearch<TDocument = unknown, TSearchRequest extends MsearchRequest = MsearchRequest>(operationName: string, parameters: TSearchRequest): Promise<{
        responses: Array<InferSearchResponseOf<TDocument, TSearchRequest, {
            restTotalHitsAsInt: false;
        }>>;
    }>;
    fieldCaps(operationName: string, request: Required<FieldCapsRequest, 'index_filter' | 'fields' | 'index'>): Promise<FieldCapsResponse>;
    esql<TOutput extends EsqlOutput = EsqlOutput>(operationName: string, parameters: ObservabilityEsQueryRequest): Promise<InferEsqlResponseOf<TOutput, {
        transform: 'none';
    }>>;
    esql<TOutput extends EsqlOutput = EsqlOutput, TEsqlOptions extends EsqlOptions = {
        transform: 'none';
    }>(operationName: string, parameters: ObservabilityEsQueryRequest, options: TEsqlOptions): Promise<InferEsqlResponseOf<TOutput, TEsqlOptions>>;
    client: ElasticsearchClient;
}
export declare function createTracedEsClient({ client, abortSignal, logger, plugin, labels, }: {
    client: ElasticsearchClient;
    logger: Logger;
    abortSignal?: AbortSignal;
    plugin?: string;
    labels?: Record<string, string>;
}): TracedElasticsearchClient;
export {};
