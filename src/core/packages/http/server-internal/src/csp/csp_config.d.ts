import type { ICspConfig } from '@kbn/core-http-server';
import type { CspAdditionalConfig, CspConfigType } from './config';
/**
 * CSP configuration for use in Kibana.
 * @public
 */
export declare class CspConfig implements ICspConfig {
    #private;
    static readonly DEFAULT: CspConfig;
    readonly strict: boolean;
    readonly disableUnsafeEval: boolean;
    readonly warnLegacyBrowsers: boolean;
    readonly disableEmbedding: boolean;
    readonly header: string;
    readonly reportOnlyHeader: string;
    /**
     * Returns the default CSP configuration when passed with no config
     * @internal
     */
    constructor(rawCspConfig: CspConfigType, ...moreConfigs: CspAdditionalConfig[]);
}
