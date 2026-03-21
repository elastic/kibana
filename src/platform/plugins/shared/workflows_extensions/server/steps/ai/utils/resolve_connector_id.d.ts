import type { KibanaRequest } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
export declare function resolveConnectorId(nameOrId: string | undefined, inferencePlugin: InferenceServerStart, kibanaRequest: KibanaRequest): Promise<string>;
