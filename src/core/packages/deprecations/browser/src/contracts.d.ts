import type { DomainDeprecationDetails } from '@kbn/core-deprecations-common';
import type { ResolveDeprecationResponse } from './types';
/**
 * DeprecationsService provides methods to fetch domain deprecation details from
 * the Kibana server.
 *
 * @public
 */
export interface DeprecationsServiceStart {
    /**
     * Grabs deprecations details for all domains.
     */
    getAllDeprecations: () => Promise<DomainDeprecationDetails[]>;
    /**
     * Grabs deprecations for a specific domain.
     *
     * @param {string} domainId
     */
    getDeprecations: (domainId: string) => Promise<DomainDeprecationDetails[]>;
    /**
     * Returns a boolean if the provided deprecation can be automatically resolvable.
     *
     * @param {DomainDeprecationDetails} details
     */
    isDeprecationResolvable: (details: DomainDeprecationDetails) => boolean;
    /**
     * Calls the correctiveActions.api to automatically resolve the depprecation.
     *
     * @param {DomainDeprecationDetails} details
     */
    resolveDeprecation: (details: DomainDeprecationDetails) => Promise<ResolveDeprecationResponse>;
}
