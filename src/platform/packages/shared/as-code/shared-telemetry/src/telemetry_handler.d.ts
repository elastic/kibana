import type { IKibanaResponse, KibanaRequest } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
export declare function telemetryHandler<TResponse extends IKibanaResponse>(request: KibanaRequest, usageCounter: UsageCounter | undefined, handler: () => Promise<TResponse> | TResponse): Promise<TResponse>;
