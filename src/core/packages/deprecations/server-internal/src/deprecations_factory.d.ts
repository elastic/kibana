import type { Logger } from '@kbn/logging';
import type { DomainDeprecationDetails } from '@kbn/core-deprecations-common';
import type { GetDeprecationsContext } from '@kbn/core-deprecations-server';
import { DeprecationsRegistry } from './deprecations_registry';
export interface DeprecationsFactoryDeps {
    logger: Logger;
    config: DeprecationsFactoryConfig;
}
export interface DeprecationsFactoryConfig {
    ignoredConfigDeprecations: string[];
}
export declare class DeprecationsFactory {
    private readonly registries;
    private readonly logger;
    private readonly config;
    constructor({ logger, config }: DeprecationsFactoryDeps);
    getRegistry: (domainId: string) => DeprecationsRegistry;
    getDeprecations: (domainId: string, dependencies: GetDeprecationsContext) => Promise<DomainDeprecationDetails[]>;
    getAllDeprecations: (dependencies: GetDeprecationsContext) => Promise<DomainDeprecationDetails[]>;
    private createDeprecationInfo;
    private getDeprecationsBody;
}
