import type { IExternalUrlPolicy } from '@kbn/core-http-common';
import type { IExternalUrlConfig } from '@kbn/core-http-server';
/**
 * External Url configuration for use in Kibana.
 * @public
 */
export declare class ExternalUrlConfig implements IExternalUrlConfig {
    static readonly DEFAULT: ExternalUrlConfig;
    readonly policy: IExternalUrlPolicy[];
    /**
     * Returns the default External Url configuration when passed with no config
     * @internal
     */
    constructor(rawConfig: IExternalUrlConfig);
}
