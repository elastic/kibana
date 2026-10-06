import type { CoreUsageStats } from './core_usage_stats';
import type { CoreConfigUsageData, CoreEnvironmentUsageData, CoreServicesUsageData } from './core_usage_data';
/**
 * Internal API for getting Core's usage data payload.
 *
 * @note This API should never be used to drive application logic and is only
 * intended for telemetry purposes.
 *
 * @public
 */
export interface CoreUsageDataStart {
    /**
     * Internal API for getting Core's usage data payload.
     *
     * @note This API should never be used to drive application logic and is only
     * intended for telemetry purposes.
     *
     * @internal
     * */
    getCoreUsageData(): Promise<CoreUsageData>;
    getConfigsUsageData(): Promise<ConfigUsageData>;
}
/**
 * Type describing Core's usage data payload
 * @public
 */
export interface CoreUsageData extends CoreUsageStats {
    config: CoreConfigUsageData;
    services: CoreServicesUsageData;
    environment: CoreEnvironmentUsageData;
}
/**
 * Type describing Core's usage data payload
 * @public
 */
export type ConfigUsageData = Record<string, any | any[]>;
