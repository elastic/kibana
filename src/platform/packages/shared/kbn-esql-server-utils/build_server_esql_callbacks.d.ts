import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLCallbacks } from '@kbn/esql-types';
export interface BuildServerESQLCallbacksOptions {
    client: ElasticsearchClient;
}
/**
 * Builds the ESQLCallbacks required by the ES|QL validation API
 * ({@link validateQuery} from @kbn/esql-language) for server-side usage.
 *
 * Uses the Elasticsearch client directly instead of going through
 * Kibana HTTP routes, unlike the client-side callbacks in @kbn/esql-utils.
 */
export declare const buildServerESQLCallbacks: ({ client, }: BuildServerESQLCallbacksOptions) => ESQLCallbacks;
