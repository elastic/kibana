/**
 * Core's FIPS service
 *
 * @public
 */
export interface CoreFipsService {
    /**
     * Check if Kibana is configured to run in FIPS mode
     */
    isEnabled(): boolean;
}
