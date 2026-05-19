import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { PluginSetup as DataPluginSetup, PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import type { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
/**
 * Saved search plugin server Setup contract
 */
export interface SavedSearchPublicSetupDependencies {
    data: DataPluginSetup;
    contentManagement: ContentManagementServerSetup;
    expressions: ExpressionsServerSetup;
}
export interface SavedSearchServerStartDeps {
    data: DataPluginStart;
}
export declare class SavedSearchServerPlugin implements Plugin<object, object, object, SavedSearchServerStartDeps> {
    private initializerContext;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup, { data, contentManagement, expressions }: SavedSearchPublicSetupDependencies): {};
    start(core: CoreStart): {
        getSavedSearch: <Serialized extends boolean = false, ReturnType = Serialized extends true ? import("../common/types").SerializableSavedSearch : import("../common").SavedSearch>(savedSearchId: string, deps: import("../common/service/get_saved_searches").GetSavedSearchDependencies, serialized?: Serialized) => Promise<ReturnType>;
    };
    stop(): void;
}
