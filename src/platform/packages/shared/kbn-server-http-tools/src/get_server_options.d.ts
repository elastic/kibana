import type { ServerOptions } from '@hapi/hapi';
import type { IHttpConfig } from './types';
/**
 * Converts Kibana `HttpConfig` into `ServerOptions` that are accepted by the Hapi server.
 */
export declare function getServerOptions(config: IHttpConfig, { configureTLS }?: {
    configureTLS?: boolean | undefined;
}): ServerOptions;
