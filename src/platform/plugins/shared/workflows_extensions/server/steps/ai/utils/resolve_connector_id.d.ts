import type { KibanaRequest } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
export interface ResolveConnectorIdOptions {
    featureId?: string;
    searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
}
export declare function resolveConnectorId(nameOrId: string | undefined, inferencePlugin: InferenceServerStart, kibanaRequest: KibanaRequest, options?: ResolveConnectorIdOptions): Promise<string>;
