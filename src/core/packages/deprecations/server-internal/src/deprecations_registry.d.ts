import type { DeprecationsDetails } from '@kbn/core-deprecations-common';
import type { RegisterDeprecationsConfig, GetDeprecationsContext } from '@kbn/core-deprecations-server';
export declare class DeprecationsRegistry {
    private readonly timeout;
    private readonly deprecationContexts;
    constructor({ timeout }?: {
        timeout?: number;
    });
    registerDeprecations: (deprecationContext: RegisterDeprecationsConfig) => void;
    getDeprecations: (dependencies: GetDeprecationsContext) => Promise<Array<PromiseSettledResult<DeprecationsDetails[]>>>;
}
