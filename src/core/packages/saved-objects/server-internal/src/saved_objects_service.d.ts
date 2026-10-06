import type { Observable } from 'rxjs';
import type { ServiceStatus } from '@kbn/core-status-common';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { DocLinksServiceSetup, DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { InternalElasticsearchServiceSetup, InternalElasticsearchServiceStart } from '@kbn/core-elasticsearch-server-internal';
import type { SavedObjectsServiceSetup, SavedObjectsServiceStart, SavedObjectStatusMeta, ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { DeprecationRegistryProvider } from '@kbn/core-deprecations-server';
import type { NodeInfo } from '@kbn/core-node-server';
/**
 * @internal
 */
export interface InternalSavedObjectsServiceSetup extends SavedObjectsServiceSetup {
    status$: Observable<ServiceStatus<SavedObjectStatusMeta>>;
    /** Note: this must be called after server.setup to get all plugin SO types */
    getTypeRegistry: () => ISavedObjectTypeRegistry;
}
/**
 * @internal
 */
export interface InternalSavedObjectsServiceStart extends SavedObjectsServiceStart {
    metrics: {
        /**
         * The number of milliseconds it took to run the SO migrator.
         *
         * Note: it's the time spent in the `migrator.runMigrations` call.
         * The value will be recorded even if a migration wasn't strictly performed,
         * and in that case it will just be the time spent checking if a migration was required.
         */
        migrationDuration: number;
    };
}
/** @internal */
export interface SavedObjectsSetupDeps {
    http: InternalHttpServiceSetup;
    elasticsearch: InternalElasticsearchServiceSetup;
    coreUsageData: InternalCoreUsageDataSetup;
    deprecations: DeprecationRegistryProvider;
    docLinks: DocLinksServiceSetup;
}
/** @internal */
export interface SavedObjectsStartDeps {
    elasticsearch: InternalElasticsearchServiceStart;
    pluginsInitialized?: boolean;
    docLinks: DocLinksServiceStart;
    node: NodeInfo;
}
export declare class SavedObjectsService implements CoreService<InternalSavedObjectsServiceSetup, InternalSavedObjectsServiceStart> {
    private readonly coreContext;
    private logger;
    private readonly kibanaVersion;
    private setupDeps?;
    private config?;
    private clientFactoryProvider?;
    private encryptionExtensionFactory?;
    private securityExtensionFactory?;
    private spacesExtensionFactory?;
    private accessControlTransforms?;
    private migrator$;
    private typeRegistry;
    private started;
    constructor(coreContext: CoreContext);
    setup(setupDeps: SavedObjectsSetupDeps): Promise<InternalSavedObjectsServiceSetup>;
    start({ elasticsearch, pluginsInitialized, docLinks, node, }: SavedObjectsStartDeps): Promise<InternalSavedObjectsServiceStart>;
    private getInternalExtensions;
    stop(): Promise<void>;
    private assertNoUnallowedWipTypes;
    private createMigrator;
}
