import type { HttpSetup } from '@kbn/core-http-browser';
export interface FetchAlertsIndexNamesParams {
    http: HttpSetup;
    /**
     * Array of rule type ids used for authorization and area-based filtering
     */
    ruleTypeIds: string[];
}
