import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { DeprecationRegistryProvider, DeprecationsClient } from '@kbn/core-deprecations-server';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { KibanaRequest } from '@kbn/core-http-server';
import { type InternalLoggingServiceSetup } from '@kbn/core-logging-server-internal';
import type { DocLinksServiceSetup } from '@kbn/core-doc-links-server';
/**
 * Deprecation Service: Internal Start contract
 */
export interface InternalDeprecationsServiceStart {
    /**
     * Creates a {@link DeprecationsClient} with provided SO client and ES client.
     * @param esClient Scoped Elasticsearch client
     * @param savedObjectsClient Scoped SO Client
     */
    asScopedToClient(esClient: IScopedClusterClient, savedObjectsClient: SavedObjectsClientContract, request: KibanaRequest): DeprecationsClient;
}
/** @internal */
export type InternalDeprecationsServiceSetup = DeprecationRegistryProvider;
/** @internal */
export interface DeprecationsSetupDeps {
    http: InternalHttpServiceSetup;
    coreUsageData: InternalCoreUsageDataSetup;
    logging: InternalLoggingServiceSetup;
    docLinks: DocLinksServiceSetup;
}
/** @internal */
export declare class DeprecationsService implements CoreService<InternalDeprecationsServiceSetup, InternalDeprecationsServiceStart> {
    private readonly logger;
    private readonly configService;
    private deprecationsFactory?;
    constructor(coreContext: Pick<CoreContext, 'logger' | 'configService'>);
    setup({ http, coreUsageData, logging, docLinks, }: DeprecationsSetupDeps): Promise<InternalDeprecationsServiceSetup>;
    start(): InternalDeprecationsServiceStart;
    stop(): void;
    private createScopedDeprecations;
}
