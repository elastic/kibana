import type { IRouter, Logger } from '@kbn/core/server';
import type { EsLegacyConfigService, SpecDefinitionsService } from '../services';
import type { ESConfigForProxy } from '../types';
import type { handleEsError } from '../shared_imports';
export interface ProxyDependencies {
    readLegacyESConfig: () => Promise<ESConfigForProxy>;
}
export interface RouteDependencies {
    router: IRouter;
    log: Logger;
    proxy: ProxyDependencies;
    services: {
        esLegacyConfigService: EsLegacyConfigService;
        specDefinitionService: SpecDefinitionsService;
    };
    lib: {
        handleEsError: typeof handleEsError;
    };
}
export declare const registerRoutes: (dependencies: RouteDependencies) => void;
