import type { ServerOptions as TLSOptions } from 'https';
import type { ISslConfig } from './types';
/**
 * Converts Kibana `SslConfig` into `TLSOptions` that are accepted by the Hapi server,
 * and by https.Server.setSecureContext()
 */
export declare function getServerTLSOptions(ssl: ISslConfig): TLSOptions | undefined;
