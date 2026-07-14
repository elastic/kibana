import type { IExternalUrlPolicy } from '@kbn/core-http-common';
/**
 * External Url configuration for use in Kibana.
 * @public
 */
export interface IExternalUrlConfig {
    /**
     * A set of policies describing which external urls are allowed.
     */
    readonly policy: IExternalUrlPolicy[];
}
