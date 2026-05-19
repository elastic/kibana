import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { DataViewsServerPluginSetup, DataViewsServerPluginStart, DataViewsServerPluginSetupDependencies, DataViewsServerPluginStartDependencies } from './types';
export declare class DataViewsServerPlugin implements Plugin<DataViewsServerPluginSetup, DataViewsServerPluginStart, DataViewsServerPluginSetupDependencies, DataViewsServerPluginStartDependencies> {
    private readonly initializerContext;
    private readonly logger;
    private rollupsEnabled;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, { expressions, usageCollection, contentManagement }: DataViewsServerPluginSetupDependencies): {
        enableRollups: () => boolean;
    };
    start({ uiSettings, capabilities }: CoreStart, { fieldFormats }: DataViewsServerPluginStartDependencies): {
        dataViewsServiceFactory: (savedObjectsClient: import("@kbn/core/server").SavedObjectsClientContract, elasticsearchClient: import("@kbn/core/server").ElasticsearchClient, request?: import("@kbn/core/server").KibanaRequest, byPassCapabilities?: boolean) => Promise<import("../common").DataViewsService>;
        getScriptedFieldsEnabled: () => boolean;
    };
    stop(): void;
}
export { DataViewsServerPlugin as Plugin };
