import type { CoreContext } from '@kbn/core-base-server-internal';
import type { UiPlugins } from '@kbn/core-plugins-base-server-internal';
import type { InternalCorePreboot, InternalCoreSetup, InternalCoreStart } from '@kbn/core-lifecycle-server-internal';
/** @internal */
export declare class CoreAppsService {
    private readonly logger;
    private readonly env;
    private readonly configService;
    private readonly config$;
    private readonly savedObjectsStart$;
    private readonly stop$;
    constructor(core: CoreContext);
    preboot(corePreboot: InternalCorePreboot, uiPlugins: UiPlugins): Promise<void>;
    setup(coreSetup: InternalCoreSetup, uiPlugins: UiPlugins): Promise<void>;
    start(coreStart: InternalCoreStart): void;
    stop(): void;
    private registerPrebootDefaultRoutes;
    private registerDefaultRoutes;
    private maybeRegisterDynamicConfigurationFeature;
    /**
     * Registers the HTTP API that allows updating in-memory the settings that opted-in to be dynamically updatable.
     * @param router {@link IRouter}
     * @param savedObjectClient$ An observable of a {@link SavedObjectsClientContract | savedObjects client} that will be used to update the document
     * @internal
     */
    private registerInternalCoreSettingsRoute;
    private registerCommonDefaultRoutes;
    private registerStaticDirs;
}
