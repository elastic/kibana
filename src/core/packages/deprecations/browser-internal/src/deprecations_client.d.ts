import type { HttpStart } from '@kbn/core-http-browser';
import type { DomainDeprecationDetails } from '@kbn/core-deprecations-common';
import type { ResolveDeprecationResponse } from '@kbn/core-deprecations-browser';
export interface DeprecationsClientDeps {
    http: Pick<HttpStart, 'fetch'>;
}
export declare class DeprecationsClient {
    private readonly http;
    constructor({ http }: DeprecationsClientDeps);
    private fetchDeprecations;
    getAllDeprecations: () => Promise<DomainDeprecationDetails[]>;
    getDeprecations: (domainId: string) => Promise<DomainDeprecationDetails[]>;
    isDeprecationResolvable: (details: DomainDeprecationDetails) => boolean;
    private getResolveFetchDetails;
    resolveDeprecation: (details: DomainDeprecationDetails) => Promise<ResolveDeprecationResponse>;
}
