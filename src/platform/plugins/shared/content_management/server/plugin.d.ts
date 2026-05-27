import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { ContentManagementServerSetup, ContentManagementServerStart, ContentManagementServerSetupDependencies, ContentManagementServerStartDependencies } from './types';
export declare class ContentManagementPlugin implements Plugin<ContentManagementServerSetup, ContentManagementServerStart, ContentManagementServerSetupDependencies, ContentManagementServerStartDependencies> {
    private readonly logger;
    private readonly core;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup, plugins: ContentManagementServerSetupDependencies): {
        favorites: import("@kbn/content-management-favorites-server/src/favorites_registry").FavoritesRegistrySetup;
        register: import("./core").ContentRegistry["register"];
        crud: <T = unknown>(contentType: string) => import("./core").ContentCrud<T>;
        eventBus: import("./core/event_bus").EventBus;
        contentClient: {
            getForRequest(deps: import("./core/core").GetContentClientForRequestDependencies): {
                for: <T = unknown>(contentTypeId: string, version?: import("@kbn/object-versioning").Version) => import("./types").IContentClient<T>;
                msearch(args: import("../common/rpc").MSearchIn): Promise<import("../common/rpc").MSearchOut>;
            };
        };
    };
    start(core: CoreStart): {};
}
