import type { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import type { Logger } from '@kbn/logging';
import type { CustomHostSettings, ProxySettings, SSLSettings } from './types';
/**
 * Create http and https proxy agents with custom proxy /hosts/SSL settings from configurationUtilities
 */
interface GetCustomAgentsResponse {
    httpAgent: HttpAgent | undefined;
    httpsAgent: HttpsAgent | undefined;
}
interface GetCustomAgentsOpts {
    customHostSettings?: CustomHostSettings;
    logger: Logger;
    proxySettings?: ProxySettings;
    sslOverrides?: SSLSettings;
    sslSettings: SSLSettings;
    url: string;
}
export declare function getCustomAgents(opts: GetCustomAgentsOpts): GetCustomAgentsResponse;
export {};
